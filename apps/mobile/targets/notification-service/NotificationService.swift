import ImageIO
import Intents
import UniformTypeIdentifiers
import UserNotifications

/// Upgrades incoming chat pushes into iOS communication notifications
/// (sender dog avatar + name, iMessage-style) by donating an
/// `INSendMessageIntent` and rebuilding the notification content from it.
///
/// The server marks chat pushes with `mutable-content: 1` and ships
/// `senderName` / `senderAvatarUrl` / `recipientId` / `recipientName` / `url`
/// in the Expo push `data` payload (see MessageService.ts).
///
/// NSE contract: no matter what fails (missing fields, avatar download,
/// intent donation), the original notification content is still delivered.
/// This class must never swallow a notification or hand back broken content.
final class NotificationService: UNNotificationServiceExtension, URLSessionDataDelegate {
  private static let maximumAvatarBytes = 5 * 1024 * 1024
  private static let avatarPixelSize = 256
  private static let acceptedAvatarMIMETypes: Set<String> = [
    "application/octet-stream",
    "image/heic",
    "image/heif",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]

  private let deliveryLock = NSLock()
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var fallbackContent: UNNotificationContent?
  private var bestAttemptContent: UNMutableNotificationContent?
  private var avatarSession: URLSession?
  private var avatarTask: URLSessionDataTask?
  private var avatarData = Data()
  private var avatarCompletion: ((INImage?) -> Void)?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    deliveryLock.lock()
    self.contentHandler = contentHandler
    fallbackContent = request.content
    deliveryLock.unlock()

    guard let bestAttempt = request.content.mutableCopy() as? UNMutableNotificationContent else {
      deliver(request.content)
      return
    }
    deliveryLock.lock()
    let isDeliveryActive = self.contentHandler != nil
    deliveryLock.unlock()
    guard isDeliveryActive else { return }

    let data = Self.expoData(from: request.content.userInfo)

    guard
      let rawSenderName = data["senderName"] as? String,
      let rawRecipientId = data["recipientId"] as? String,
      let rawRecipientName = data["recipientName"] as? String,
      let url = data["url"] as? String, !url.isEmpty
    else {
      // Not a payload we know how to upgrade: deliver as-is.
      deliver(bestAttempt)
      return
    }

    // Deep-link convention from the server: chat/<matchId>/<senderDogId>.
    let senderName = rawSenderName.trimmingCharacters(in: .whitespacesAndNewlines)
    let recipientId = rawRecipientId.trimmingCharacters(in: .whitespacesAndNewlines)
    let recipientName = rawRecipientName.trimmingCharacters(in: .whitespacesAndNewlines)
    let parts = url.split(separator: "/", omittingEmptySubsequences: false).map(String.init)
    guard
      !senderName.isEmpty,
      !recipientId.isEmpty,
      !recipientName.isEmpty,
      parts.count == 3,
      parts[0] == "chat",
      !parts[1].isEmpty,
      !parts[2].isEmpty
    else {
      deliver(bestAttempt)
      return
    }

    let conversationId = parts[1]
    let senderId = parts[2]

    // Group notifications per conversation even if the intent rebuild fails.
    bestAttempt.threadIdentifier = conversationId

    // Publish the mutable fallback only after its final mutation. Expiry may
    // read and deliver it from another thread once it is stored here.
    deliveryLock.lock()
    let shouldDownloadAvatar = self.contentHandler != nil
    if shouldDownloadAvatar {
      bestAttemptContent = bestAttempt
      fallbackContent = bestAttempt
    }
    deliveryLock.unlock()
    guard shouldDownloadAvatar else { return }

    let avatarUrl = (data["senderAvatarUrl"] as? String).flatMap(URL.init(string:))

    downloadAvatar(from: avatarUrl) { [weak self] avatar in
      guard let self else { return }
      Self.communicationContent(
        from: bestAttempt,
        senderId: senderId,
        senderName: senderName,
        recipientId: recipientId,
        recipientName: recipientName,
        conversationId: conversationId,
        avatar: avatar
      ) { [weak self] upgraded in
        self?.deliver(upgraded ?? bestAttempt)
      }
    }
  }

  override func serviceExtensionTimeWillExpire() {
    // Out of time: atomically claim the handler and ship the best we have.
    deliveryLock.lock()
    let fallback = bestAttemptContent ?? fallbackContent
    deliveryLock.unlock()

    if let fallback {
      deliver(fallback)
    }
  }

  private func deliver(_ content: UNNotificationContent) {
    deliveryLock.lock()
    let handler = contentHandler
    contentHandler = nil
    fallbackContent = nil
    bestAttemptContent = nil
    deliveryLock.unlock()

    guard let handler else { return }

    cancelAvatarDownload()
    handler(content)
  }

  // MARK: - Payload parsing

  /// Expo's push gateway delivers the message's `data` field under the
  /// top-level `body` key of the APNs payload (dictionary, or JSON string in
  /// older gateway versions). Handle both shapes defensively.
  private static func expoData(from userInfo: [AnyHashable: Any]) -> [String: Any] {
    if let dict = userInfo["body"] as? [String: Any] {
      return dict
    }
    if let string = userInfo["body"] as? String,
      let data = string.data(using: .utf8),
      let dict = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    {
      return dict
    }
    return [:]
  }

  // MARK: - Avatar download

  /// Fetches the sender's avatar. MIME and byte limits are enforced while
  /// streaming so untrusted remote content cannot exhaust the NSE's memory.
  /// Always calls `completion`, with `nil` on failure.
  private func downloadAvatar(from url: URL?, completion: @escaping (INImage?) -> Void) {
    guard let url, Self.isSafeHTTPSURL(url) else {
      completion(nil)
      return
    }

    let configuration = URLSessionConfiguration.ephemeral
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    // Avatar treatment is optional. Never delay a new-message alert for a
    // slow image host when the text fallback is already ready to deliver.
    configuration.timeoutIntervalForRequest = 3
    configuration.timeoutIntervalForResource = 3

    let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    var request = URLRequest(url: url)
    request.setValue("image/*", forHTTPHeaderField: "Accept")
    let task = session.dataTask(with: request)

    deliveryLock.lock()
    let shouldStart = contentHandler != nil
    if shouldStart {
      avatarCompletion = completion
      avatarData = Data()
      avatarSession = session
      avatarTask = task
    }
    deliveryLock.unlock()

    guard shouldStart else {
      session.invalidateAndCancel()
      return
    }

    task.resume()
  }

  func urlSession(
    _ session: URLSession,
    dataTask: URLSessionDataTask,
    didReceive response: URLResponse,
    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void
  ) {
    let mimeType = (response as? HTTPURLResponse)?.mimeType?.lowercased()
    guard
      let response = response as? HTTPURLResponse,
      (200..<300).contains(response.statusCode),
      mimeType.map(Self.acceptedAvatarMIMETypes.contains) ?? true,
      response.expectedContentLength <= 0
        || response.expectedContentLength <= Int64(Self.maximumAvatarBytes)
    else {
      completionHandler(.cancel)
      finishAvatarDownload(with: nil)
      return
    }

    completionHandler(.allow)
  }

  func urlSession(
    _ session: URLSession,
    task: URLSessionTask,
    willPerformHTTPRedirection response: HTTPURLResponse,
    newRequest request: URLRequest,
    completionHandler: @escaping (URLRequest?) -> Void
  ) {
    guard
      let originalURL = task.originalRequest?.url,
      let redirectURL = request.url,
      Self.isSafeHTTPSURL(redirectURL),
      redirectURL.host?.caseInsensitiveCompare(originalURL.host ?? "") == .orderedSame,
      (redirectURL.port ?? 443) == (originalURL.port ?? 443)
    else {
      completionHandler(nil)
      finishAvatarDownload(with: nil)
      return
    }

    completionHandler(request)
  }

  private static func isSafeHTTPSURL(_ url: URL) -> Bool {
    url.scheme?.lowercased() == "https" && url.user == nil && url.password == nil
  }

  func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
    deliveryLock.lock()
    let isActive = avatarCompletion != nil
    let hasCapacity = data.count <= Self.maximumAvatarBytes - avatarData.count
    if isActive && hasCapacity {
      avatarData.append(data)
    }
    deliveryLock.unlock()

    guard isActive else { return }
    guard hasCapacity else {
      dataTask.cancel()
      finishAvatarDownload(with: nil)
      return
    }
  }

  func urlSession(
    _ session: URLSession,
    task: URLSessionTask,
    didCompleteWithError error: Error?
  ) {
    deliveryLock.lock()
    let data = error == nil ? avatarData : Data()
    deliveryLock.unlock()

    guard !data.isEmpty else {
      finishAvatarDownload(with: nil)
      return
    }

    finishAvatarDownload(with: Self.avatarImage(from: data))
  }

  private func finishAvatarDownload(with image: INImage?) {
    deliveryLock.lock()
    let completion = avatarCompletion
    let session = avatarSession
    avatarCompletion = nil
    avatarData = Data()
    avatarTask = nil
    avatarSession = nil
    deliveryLock.unlock()

    guard let completion else { return }

    session?.finishTasksAndInvalidate()
    completion(image)
  }

  private func cancelAvatarDownload() {
    deliveryLock.lock()
    let task = avatarTask
    let session = avatarSession
    avatarCompletion = nil
    avatarData = Data()
    avatarTask = nil
    avatarSession = nil
    deliveryLock.unlock()

    task?.cancel()
    session?.invalidateAndCancel()
  }

  /// Validates and downsamples an untrusted profile photo before Intents sees
  /// it. This keeps large uploads from consuming the extension's memory while
  /// retaining enough detail for the system's small circular avatar.
  private static func avatarImage(from data: Data) -> INImage? {
    let sourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions) else {
      return nil
    }

    let thumbnailOptions =
      [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceThumbnailMaxPixelSize: avatarPixelSize,
      ] as CFDictionary
    guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbnailOptions) else {
      return nil
    }

    let encoded = NSMutableData()
    guard
      let destination = CGImageDestinationCreateWithData(
        encoded,
        UTType.jpeg.identifier as CFString,
        1,
        nil
      )
    else {
      return nil
    }

    let destinationOptions = [kCGImageDestinationLossyCompressionQuality: 0.82] as CFDictionary
    CGImageDestinationAddImage(destination, thumbnail, destinationOptions)
    guard CGImageDestinationFinalize(destination) else { return nil }

    return INImage(imageData: encoded as Data)
  }

  // MARK: - Communication styling

  /// Donates an incoming `INSendMessageIntent`, waits for SiriKit to accept
  /// it, and only then rebuilds the notification as Apple requires.
  private static func communicationContent(
    from content: UNMutableNotificationContent,
    senderId: String,
    senderName: String,
    recipientId: String,
    recipientName: String,
    conversationId: String,
    avatar: INImage?,
    completion: @escaping (UNNotificationContent?) -> Void
  ) {
    let sender = INPerson(
      personHandle: INPersonHandle(value: senderId, type: .unknown),
      nameComponents: nil,
      displayName: senderName,
      image: avatar,
      contactIdentifier: nil,
      customIdentifier: senderId,
      isMe: false,
      suggestionType: .none
    )

    let recipient = INPerson(
      personHandle: INPersonHandle(value: recipientId, type: .unknown),
      nameComponents: nil,
      displayName: recipientName,
      image: nil,
      contactIdentifier: nil,
      customIdentifier: recipientId,
      isMe: true,
      suggestionType: .none
    )

    let intent = INSendMessageIntent(
      recipients: [recipient],
      outgoingMessageType: .outgoingMessageText,
      content: content.body,
      speakableGroupName: nil,
      conversationIdentifier: conversationId,
      serviceName: nil,
      sender: sender,
      attachments: nil
    )

    let interaction = INInteraction(intent: intent, response: nil)
    interaction.direction = .incoming
    interaction.donate { error in
      guard error == nil else {
        completion(nil)
        return
      }

      completion(try? content.updating(from: intent))
    }
  }
}
