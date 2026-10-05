import CoreText
import SwiftUI
import WidgetKit

// MARK: - Shared contract

/// Keep in sync with `modules/pegada-widget/index.ts` and
/// `modules/pegada-widget/ios/PegadaWidgetModule.swift`.
private let appGroupId = "group.app.pegada"
private let snapshotKey = "matchesWidgetSnapshot"
private let widgetKind = "PegadaMatchesWidget"
private let messagesDeepLink = URL(string: "pegada:///messages")
private let swipeDeepLink = URL(string: "pegada:///swipe")

struct SnapshotDog: Decodable {
  let matchId: String?
  let dogId: String?
  let name: String
  let avatar: String?
  let prompt: String?
}

enum SnapshotState: String, Decodable {
  case attention
  case caughtUp
  case noMatches
  case signedOut
}

/// User-facing copy inside the snapshot is pre-localized by the app (i18next),
/// so this extension stays data-driven. Only the "app never wrote anything"
/// fallback lives natively, in `L10n`.
struct MatchesSnapshot: Decodable {
  let state: SnapshotState?
  let loggedIn: Bool
  let count: Int
  let primary: String?
  let secondary: String?
  let message: String
  let dogs: [SnapshotDog]

  /// Older app builds did not write a semantic state. Preserve their useful
  /// behavior while new snapshots distinguish every zero-count state.
  var resolvedState: SnapshotState {
    if let state { return state }
    if !loggedIn { return .signedOut }
    return count > 0 ? .attention : .caughtUp
  }
}

/// The app ships exactly two languages (en, pt-BR), mirrored here so the
/// widget renders sensible copy before its first snapshot.
enum L10n {
  static var isPortuguese: Bool {
    (Locale.preferredLanguages.first ?? "en").hasPrefix("pt")
  }

  static var placeholder: String {
    isPortuguese
      ? "Abra o Pegada para carregar seus matches"
      : "Open Pegada to load your matches"
  }

  static var placeholderPrimary: String {
    isPortuguese ? "Abra o Pegada" : "Open Pegada"
  }

  static var placeholderSecondary: String {
    isPortuguese ? "para carregar seus matches" : "to load your matches"
  }

  static var widgetName: String {
    "Matches"
  }

  static var widgetDescription: String {
    isPortuguese
      ? "Veja matches prontos para conversar."
      : "See matches ready to chat."
  }

  static var previewMessage: String {
    isPortuguese
      ? "3 prontos pra conversar"
      : "3 ready to chat"
  }

  static func replyTo(_ name: String) -> String {
    isPortuguese ? "Responder a \(name)" : "Reply to \(name)"
  }
}

// MARK: - Design tokens

/// Colors come from the target's colorsets (declared in
/// expo-target.config.js, mirrored from packages/shared/themes/themes.ts).
/// Gilroy is the app's brand typeface; the weights map to the same roles the
/// app uses (ExtraBold = display, Bold = emphasis, SemiBold = captions,
/// Medium = body).
private enum Brand {
  static let pink = Color("BrandPink")
  static let text = Color("PrimaryText")
  static let subtitle = Color("SubtitleText")
  static let background = Color("$widgetBackground")

  static func extraBold(_ size: CGFloat) -> Font { .custom("Gilroy-ExtraBold", size: size) }
  static func bold(_ size: CGFloat) -> Font { .custom("Gilroy-Bold", size: size) }
  static func semiBold(_ size: CGFloat) -> Font { .custom("Gilroy-SemiBold", size: size) }
  static func medium(_ size: CGFloat) -> Font { .custom("Gilroy-Medium", size: size) }
}

/// App extensions are supposed to pick fonts up from their own `UIAppFonts`
/// (see Info.plist), but widget processes have a history of skipping that
/// registration. Registering explicitly is idempotent and cheap.
private let brandFontsRegistered: Bool = {
  let fonts = Bundle.main.urls(forResourcesWithExtension: "ttf", subdirectory: nil) ?? []
  for url in fonts {
    CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
  }
  return !fonts.isEmpty
}()

// MARK: - Timeline

struct MatchesEntry: TimelineEntry {
  let date: Date
  let snapshot: MatchesSnapshot?
  /// Pre-decoded, downscaled avatars keyed by position in `snapshot.dogs`.
  let avatars: [UIImage?]
  let isPreview: Bool

  var deepLink: URL? {
    guard let snapshot else { return messagesDeepLink }
    guard snapshot.loggedIn, snapshot.resolvedState != .signedOut else { return messagesDeepLink }

    if snapshot.resolvedState != .attention || snapshot.count <= 0 {
      return swipeDeepLink
    }

    return snapshot.dogs.first.flatMap(deepLink(for:)) ?? messagesDeepLink
  }

  func deepLink(for dog: SnapshotDog) -> URL? {
    guard
      let matchId = dog.matchId,
      let dogId = dog.dogId,
      var components = URLComponents(string: "pegada:///chat/\(matchId)")
    else { return nil }
    components.queryItems = [URLQueryItem(name: "dogId", value: dogId)]
    return components.url
  }

  static func load(isPreview: Bool = false) -> MatchesEntry {
    guard
      let json = UserDefaults(suiteName: appGroupId)?.string(forKey: snapshotKey),
      let data = json.data(using: .utf8),
      let snapshot = try? JSONDecoder().decode(MatchesSnapshot.self, from: data)
    else {
      return MatchesEntry(date: Date(), snapshot: nil, avatars: [], isPreview: isPreview)
    }

    let avatars = snapshot.dogs.prefix(3).map { dog -> UIImage? in
      guard let path = dog.avatar else { return nil }
      return UIImage(contentsOfFile: path)?.thumbnail(maxPixel: 144)
    }

    return MatchesEntry(
      date: Date(),
      snapshot: snapshot,
      avatars: Array(avatars),
      isPreview: isPreview
    )
  }

  /// What the widget gallery shows before the widget is added.
  static var sample: MatchesEntry {
    MatchesEntry(
      date: Date(),
      snapshot: MatchesSnapshot(
        state: .attention,
        loggedIn: true,
        count: 3,
        primary: L10n.replyTo("Luna"),
        secondary: L10n.previewMessage,
        message: L10n.previewMessage,
        dogs: [
          SnapshotDog(
            matchId: "preview-luna",
            dogId: "preview-luna-dog",
            name: "Luna",
            avatar: nil,
            prompt: L10n.replyTo("Luna")
          ),
          SnapshotDog(
            matchId: "preview-thor",
            dogId: "preview-thor-dog",
            name: "Thor",
            avatar: nil,
            prompt: L10n.replyTo("Thor")
          ),
          SnapshotDog(
            matchId: "preview-mel",
            dogId: "preview-mel-dog",
            name: "Mel",
            avatar: nil,
            prompt: L10n.replyTo("Mel")
          ),
        ]
      ),
      avatars: [nil, nil, nil],
      isPreview: true
    )
  }
}

struct MatchesProvider: TimelineProvider {
  func placeholder(in context: Context) -> MatchesEntry {
    .sample
  }

  func getSnapshot(in context: Context, completion: @escaping (MatchesEntry) -> Void) {
    completion(context.isPreview ? .sample : .load())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<MatchesEntry>) -> Void) {
    // Data only changes when the app writes a new snapshot, which triggers an
    // explicit WidgetCenter reload; no time-based refresh needed.
    completion(Timeline(entries: [.load()], policy: .never))
  }
}

// MARK: - Views

struct AvatarView: View {
  let image: UIImage?
  let name: String
  let size: CGFloat

  var body: some View {
    Group {
      if let image {
        if #available(iOS 18.0, *) {
          Image(uiImage: image)
            .resizable()
            // Dog photos are the personal part of this widget. Keep them in
            // full color when the Home Screen uses tinted or clear glass.
            .widgetAccentedRenderingMode(.fullColor)
            .scaledToFill()
        } else {
          Image(uiImage: image)
            .resizable()
            .scaledToFill()
        }
      } else {
        ZStack {
          Brand.pink.opacity(0.18)
          Text(name.prefix(1).uppercased())
            .font(Brand.bold(size * 0.42))
            .foregroundColor(Brand.pink)
        }
        .widgetAccentable()
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
    .overlay(Circle().strokeBorder(Brand.background, lineWidth: 2))
    .accessibilityHidden(true)
  }
}

struct BrandHeader: View {
  var body: some View {
    // Lowercase on purpose: the app's logo wordmark is "pegada".
    Text("pegada")
      .font(Brand.extraBold(13))
      .foregroundColor(Brand.pink)
      .widgetAccentable()
  }
}

struct StatusMark: View {
  let symbol: String
  let size: CGFloat

  var body: some View {
    ZStack {
      Circle()
        .fill(Brand.pink.opacity(0.14))
      Circle()
        .strokeBorder(Brand.pink.opacity(0.32), lineWidth: 1)
      Image(systemName: symbol)
        .font(.system(size: size * 0.42, weight: .bold))
        // The blush circle carries the brand color; the foreground token
        // keeps the symbol legible in both light and dark appearances.
        .foregroundColor(Brand.text)
    }
    .frame(width: size, height: size)
    .widgetAccentable()
    .accessibilityHidden(true)
  }
}

struct CaughtUpFacesView: View {
  let entry: MatchesEntry
  let dogs: [SnapshotDog]
  let isMedium: Bool

  var body: some View {
    let heroSize: CGFloat = isMedium ? 62 : 50
    let supportSize: CGFloat = isMedium ? 34 : 28
    let supportX: CGFloat = isMedium ? 45 : 34

    ZStack(alignment: .leading) {
      if isMedium, dogs.indices.contains(2) {
        AvatarView(
          image: entry.avatars.indices.contains(2) ? entry.avatars[2] : nil,
          name: dogs[2].name,
          size: supportSize
        )
        .offset(x: supportX + supportSize * 0.55, y: supportSize * 0.40)
      }

      if dogs.indices.contains(1) {
        AvatarView(
          image: entry.avatars.indices.contains(1) ? entry.avatars[1] : nil,
          name: dogs[1].name,
          size: supportSize
        )
        .offset(x: supportX, y: -supportSize * 0.40)
      }

      if let dog = dogs.first {
        AvatarView(image: entry.avatars.first ?? nil, name: dog.name, size: heroSize)
      }
    }
    .frame(
      width: isMedium ? 94 : 64,
      height: isMedium ? 68 : 54,
      alignment: .leading
    )
    .accessibilityHidden(true)
  }
}

struct EmptyStateView: View {
  let entry: MatchesEntry
  let snapshot: MatchesSnapshot?
  let isMedium: Bool

  private var primary: String {
    snapshot?.primary ?? snapshot?.message ?? L10n.placeholderPrimary
  }

  private var secondary: String? {
    snapshot?.secondary ?? (snapshot == nil ? L10n.placeholderSecondary : nil)
  }

  private var accessibilityText: String {
    guard let secondary else { return primary }
    return "\(primary). \(secondary)"
  }

  private var symbol: String {
    switch snapshot?.resolvedState {
    case .signedOut:
      return "person.crop.circle.fill"
    case .noMatches:
      return "pawprint.fill"
    case .caughtUp:
      return "checkmark.circle.fill"
    case .attention:
      return "bubble.left.and.bubble.right.fill"
    case nil:
      return "arrow.down.circle.fill"
    }
  }

  @ViewBuilder
  private var visual: some View {
    if snapshot?.resolvedState == .caughtUp, let dogs = snapshot?.dogs, !dogs.isEmpty {
      CaughtUpFacesView(entry: entry, dogs: dogs, isMedium: isMedium)
    } else {
      StatusMark(symbol: symbol, size: isMedium ? 62 : 50)
    }
  }

  var body: some View {
    Group {
      if isMedium {
        HStack(spacing: 16) {
          visual
          VStack(alignment: .leading, spacing: 4) {
            BrandHeader()
            Text(primary)
              .font(Brand.bold(18))
              .foregroundColor(Brand.text)
              .lineLimit(2)
              .minimumScaleFactor(0.78)
            if let secondary {
              Text(secondary)
                .font(Brand.medium(12))
                .foregroundColor(Brand.subtitle)
                .lineLimit(2)
                .minimumScaleFactor(0.82)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        }
      } else {
        VStack(alignment: .leading, spacing: 0) {
          BrandHeader()
          Spacer(minLength: 8)
          HStack(spacing: 10) {
            visual
            VStack(alignment: .leading, spacing: 3) {
              Text(primary)
                .font(Brand.bold(15))
                .foregroundColor(Brand.text)
                .lineLimit(2)
                .minimumScaleFactor(0.76)
              if let secondary {
                Text(secondary)
                  .font(Brand.medium(11))
                  .foregroundColor(Brand.subtitle)
                  .lineLimit(2)
                  .minimumScaleFactor(0.80)
              }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
          Spacer(minLength: 0)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .accessibilityElement(children: .combine)
    .accessibilityLabel(snapshot == nil ? L10n.placeholder : accessibilityText)
  }
}

struct SmallMatchesView: View {
  let entry: MatchesEntry
  let snapshot: MatchesSnapshot

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      BrandHeader()
      Spacer(minLength: 10)

      if let dog = snapshot.dogs.first {
        HStack(spacing: 10) {
          AvatarView(image: entry.avatars.first ?? nil, name: dog.name, size: 56)

          VStack(alignment: .leading, spacing: 4) {
            Text(dog.prompt ?? snapshot.primary ?? snapshot.message)
              .font(Brand.bold(14))
              .foregroundColor(Brand.text)
              .lineLimit(2)
              .minimumScaleFactor(0.8)
            if let secondary = snapshot.secondary {
              Text(secondary)
                .font(Brand.medium(11))
                .foregroundColor(Brand.subtitle)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            }
          }
        }
      } else {
        Text(snapshot.message)
          .font(Brand.medium(13))
          .foregroundColor(Brand.text)
          .lineLimit(3)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

struct MediumHeroView: View {
  let entry: MatchesEntry
  let snapshot: MatchesSnapshot
  let dog: SnapshotDog

  var body: some View {
    HStack(spacing: 14) {
      AvatarView(image: entry.avatars.first ?? nil, name: dog.name, size: 72)

      VStack(alignment: .leading, spacing: 4) {
        BrandHeader()
        Text(dog.prompt ?? snapshot.primary ?? snapshot.message)
          .font(Brand.bold(17))
          .foregroundColor(Brand.text)
          .lineLimit(2)
          .minimumScaleFactor(0.8)
        if let secondary = snapshot.secondary {
          Text(secondary)
            .font(Brand.medium(12))
            .foregroundColor(Brand.subtitle)
            .lineLimit(2)
            .minimumScaleFactor(0.8)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
  }
}

struct SupportingDogView: View {
  let image: UIImage?
  let dog: SnapshotDog

  var body: some View {
    VStack(spacing: 4) {
      AvatarView(image: image, name: dog.name, size: 40)
      Text(dog.name)
        .font(Brand.semiBold(10))
        .foregroundColor(Brand.text)
        .lineLimit(1)
        .minimumScaleFactor(0.75)
    }
    .frame(width: 44)
  }
}

struct MediumMatchesView: View {
  let entry: MatchesEntry
  let snapshot: MatchesSnapshot

  var body: some View {
    HStack(alignment: .center, spacing: 14) {
      if let dog = snapshot.dogs.first {
        Group {
          if let destination = entry.deepLink(for: dog) {
            Link(destination: destination) {
              MediumHeroView(entry: entry, snapshot: snapshot, dog: dog)
            }
          } else {
            MediumHeroView(entry: entry, snapshot: snapshot, dog: dog)
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)

        HStack(spacing: 8) {
          ForEach(Array(snapshot.dogs.dropFirst().prefix(2).enumerated()), id: \.offset) {
            offset, supportingDog in
            let supportingView = SupportingDogView(
              image: offset + 1 < entry.avatars.count ? entry.avatars[offset + 1] : nil,
              dog: supportingDog
            )

            if let destination = entry.deepLink(for: supportingDog) {
              Link(destination: destination) {
                supportingView
              }
            } else {
              supportingView
            }
          }
        }
      } else {
        EmptyStateView(entry: entry, snapshot: snapshot, isMedium: true)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

// `containerBackground(for: .widget)` requires iOS 17. The shared extension
// target deploys to iOS 16.2, so the widget is gated here and in
// PegadaWidgetsBundle.swift; users below 17 simply won't see it in the
// gallery.
@available(iOS 17.0, *)
struct MatchesWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family

  let entry: MatchesEntry

  var body: some View {
    let _ = brandFontsRegistered
    content
      .widgetURL(entry.deepLink)
      .containerBackground(for: .widget) {
        Brand.background
      }
  }

  @ViewBuilder
  private var content: some View {
    if let snapshot = entry.snapshot,
      snapshot.loggedIn,
      snapshot.resolvedState == .attention,
      snapshot.count > 0
    {
      switch family {
      case .systemMedium:
        MediumMatchesView(entry: entry, snapshot: snapshot)
      default:
        SmallMatchesView(entry: entry, snapshot: snapshot)
      }
    } else {
      EmptyStateView(
        entry: entry,
        snapshot: entry.snapshot,
        isMedium: family == .systemMedium
      )
    }
  }
}

@available(iOS 17.0, *)
struct MatchesWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: widgetKind, provider: MatchesProvider()) { entry in
      MatchesWidgetEntryView(entry: entry)
    }
    .configurationDisplayName(L10n.widgetName)
    .description(L10n.widgetDescription)
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

// MARK: - Helpers

extension UIImage {
  /// Downscales so the largest dimension is `maxPixel`, keeping the archived
  /// timeline payload small (WidgetKit renders out-of-process with a tight
  /// memory budget).
  func thumbnail(maxPixel: CGFloat) -> UIImage {
    let largest = max(size.width, size.height)
    guard largest > maxPixel, largest > 0 else { return self }

    let scaleFactor = maxPixel / largest
    let newSize = CGSize(width: size.width * scaleFactor, height: size.height * scaleFactor)

    let format = UIGraphicsImageRendererFormat()
    format.scale = 1

    return UIGraphicsImageRenderer(size: newSize, format: format).image { _ in
      draw(in: CGRect(origin: .zero, size: newSize))
    }
  }
}
