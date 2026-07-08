import Intents
import UserNotifications

/// Upgrades incoming chat pushes into iOS communication notifications
/// (sender dog avatar + name, iMessage-style) by donating an
/// `INSendMessageIntent` and rebuilding the notification content from it.
///
/// The server marks chat pushes with `mutable-content: 1` and ships
/// `senderName` / `senderAvatarUrl` / `url` in the Expo push `data` payload
/// (see packages/api/src/services/MessageService.ts).
///
/// NSE contract: no matter what fails (missing fields, avatar download,
/// intent donation), the original notification content is still delivered.
/// This class must never swallow a notification or hand back broken content.
final class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttemptContent: UNMutableNotificationContent?
  private var avatarTask: URLSessionDataTask?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler

    guard let bestAttempt = request.content.mutableCopy() as? UNMutableNotificationContent else {
      contentHandler(request.content)
      return
    }
    bestAttemptContent = bestAttempt

    let data = Self.expoData(from: request.content.userInfo)

    guard
      let senderName = data["senderName"] as? String, !senderName.isEmpty,
      let url = data["url"] as? String, !url.isEmpty
    else {
      // Not a payload we know how to upgrade: deliver as-is.
      contentHandler(bestAttempt)
      return
    }

    // Deep-link convention from the server: chat/<matchId>/<senderDogId>.
    let parts = url.split(separator: "/").map(String.init)
    let conversationId = parts.count > 1 ? parts[1] : url
    let senderId = parts.count > 2 ? parts[2] : senderName

    // Group notifications per conversation even if the intent rebuild fails.
    bestAttempt.threadIdentifier = conversationId

    let avatarUrl = (data["senderAvatarUrl"] as? String).flatMap(URL.init(string:))

    downloadAvatar(from: avatarUrl) { [weak self] avatar in
      guard let self else { return }
      let upgraded = Self.communicationContent(
        from: bestAttempt,
        senderId: senderId,
        senderName: senderName,
        conversationId: conversationId,
        avatar: avatar
      )
      self.deliver(upgraded ?? bestAttempt)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    // Out of time: cancel the avatar download and ship the best we have.
    avatarTask?.cancel()
    if let bestAttemptContent {
      deliver(bestAttemptContent)
    }
  }

  private func deliver(_ content: UNNotificationContent) {
    contentHandler?(content)
    contentHandler = nil
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

  /// Fetches the sender's avatar. Always calls `completion`, with `nil` on
  /// any failure so the notification still upgrades (just without a photo).
  private func downloadAvatar(from url: URL?, completion: @escaping (INImage?) -> Void) {
    guard let url, url.scheme == "https" else {
      completion(nil)
      return
    }

    // Stay well inside the NSE's ~30s budget so the intent donation and
    // handoff still happen even on a slow network.
    let task = URLSession.shared.dataTask(with: url) { data, response, _ in
      guard
        let data, !data.isEmpty,
        let httpResponse = response as? HTTPURLResponse,
        (200..<300).contains(httpResponse.statusCode)
      else {
        completion(nil)
        return
      }
      completion(INImage(imageData: data))
    }
    avatarTask = task
    task.resume()
  }

  // MARK: - Communication styling

  /// Donates an incoming `INSendMessageIntent` for the sender and rebuilds
  /// the notification content from it. Returns `nil` on any failure so the
  /// caller can fall back to the untouched content.
  private static func communicationContent(
    from content: UNMutableNotificationContent,
    senderId: String,
    senderName: String,
    conversationId: String,
    avatar: INImage?
  ) -> UNNotificationContent? {
    let sender = INPerson(
      personHandle: INPersonHandle(value: senderId, type: .unknown),
      nameComponents: nil,
      displayName: senderName,
      image: avatar,
      contactIdentifier: nil,
      customIdentifier: senderId
    )

    let intent = INSendMessageIntent(
      recipients: nil,
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
    interaction.donate(completion: nil)

    return try? content.updating(from: intent)
  }
}
