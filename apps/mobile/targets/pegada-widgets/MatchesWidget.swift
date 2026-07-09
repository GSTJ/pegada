import CoreText
import SwiftUI
import WidgetKit

// MARK: - Shared contract

/// Keep in sync with `modules/pegada-widget/index.ts` and
/// `modules/pegada-widget/ios/PegadaWidgetModule.swift`.
private let appGroupId = "group.app.pegada"
private let snapshotKey = "matchesWidgetSnapshot"
private let widgetKind = "PegadaMatchesWidget"
private let messagesDeepLink = URL(string: "pegada://messages")

struct SnapshotDog: Decodable {
  let name: String
  let avatar: String?
}

/// User-facing copy inside the snapshot is pre-localized by the app (i18next),
/// so this extension stays data-driven. Only the "app never wrote anything"
/// fallback lives natively, in `L10n`.
struct MatchesSnapshot: Decodable {
  let loggedIn: Bool
  let count: Int
  let message: String
  let dogs: [SnapshotDog]
}

/// The app ships exactly two languages (en, pt-BR), mirrored here so the
/// widget renders sensible copy before its first snapshot.
enum L10n {
  static var isPortuguese: Bool {
    (Locale.preferredLanguages.first ?? "en").hasPrefix("pt")
  }

  static var placeholder: String {
    isPortuguese
      ? "Abra o Pegada para ver seus matches aqui"
      : "Open Pegada to see your matches here"
  }

  static var widgetDescription: String {
    isPortuguese
      ? "Veja os matches esperando sua resposta."
      : "See the matches waiting for your reply."
  }

  static var previewMessage: String {
    isPortuguese
      ? "3 matches esperando sua resposta"
      : "3 matches waiting for your reply"
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
        loggedIn: true,
        count: 3,
        message: L10n.previewMessage,
        dogs: [
          SnapshotDog(name: "Luna", avatar: nil),
          SnapshotDog(name: "Thor", avatar: nil),
          SnapshotDog(name: "Mel", avatar: nil),
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
        Image(uiImage: image)
          .resizable()
          .scaledToFill()
      } else {
        ZStack {
          Brand.pink.opacity(0.18)
          Text(name.prefix(1).uppercased())
            .font(Brand.bold(size * 0.42))
            .foregroundColor(Brand.pink)
        }
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
    .overlay(Circle().strokeBorder(Brand.background, lineWidth: 2))
  }
}

/// The "+N" coin at the end of an overlapping avatar stack; same shape and
/// ring as the avatars so the overflow reads as one more member of the pack,
/// not an afterthought.
struct OverflowChip: View {
  let count: Int
  let size: CGFloat

  var body: some View {
    ZStack {
      Circle().fill(Brand.pink)
      Text("+\(count)")
        .font(Brand.bold(size * 0.36))
        .foregroundColor(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
    }
    .frame(width: size, height: size)
    .overlay(Circle().strokeBorder(Brand.background, lineWidth: 2))
  }
}

struct AvatarStack: View {
  let entry: MatchesEntry
  let size: CGFloat

  private var dogs: [SnapshotDog] {
    Array(entry.snapshot?.dogs.prefix(3) ?? [])
  }

  private var overflow: Int {
    max(0, (entry.snapshot?.count ?? 0) - dogs.count)
  }

  var body: some View {
    HStack(spacing: -size * 0.28) {
      ForEach(Array(dogs.enumerated()), id: \.offset) { index, dog in
        AvatarView(
          image: index < entry.avatars.count ? entry.avatars[index] : nil,
          name: dog.name,
          size: size
        )
      }
      if overflow > 0 {
        OverflowChip(count: overflow, size: size)
      }
    }
  }
}

struct BrandHeader: View {
  var body: some View {
    // Lowercase on purpose: the app's logo wordmark is "pegada".
    Text("pegada")
      .font(Brand.extraBold(13))
      .foregroundColor(Brand.pink)
  }
}

/// Full-bleed widget background: flat theme surface with a single paw
/// watermark peeking from the bottom-trailing corner (the one paw reference
/// per surface, the header stays wordmark-only).
struct WidgetBackground: View {
  var body: some View {
    ZStack(alignment: .bottomTrailing) {
      Brand.background
      Image(systemName: "pawprint.fill")
        .resizable()
        .scaledToFit()
        .frame(width: 64, height: 64)
        .rotationEffect(.degrees(-24))
        .foregroundColor(Brand.pink.opacity(0.10))
        .offset(x: 14, y: 16)
    }
  }
}

struct EmptyStateView: View {
  let message: String

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      BrandHeader()
      Spacer(minLength: 0)
      Text(message)
        .font(Brand.medium(13))
        .foregroundColor(Brand.text)
        .lineLimit(3)
        .minimumScaleFactor(0.85)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

struct SmallMatchesView: View {
  let entry: MatchesEntry
  let snapshot: MatchesSnapshot

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      BrandHeader()
      Spacer(minLength: 8)
      AvatarStack(entry: entry, size: 36)
      Spacer(minLength: 8)
      Text(snapshot.message)
        .font(Brand.medium(12))
        .foregroundColor(Brand.text)
        .lineLimit(2)
        .minimumScaleFactor(0.85)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

struct MediumMatchesView: View {
  let entry: MatchesEntry
  let snapshot: MatchesSnapshot

  private var dogs: [SnapshotDog] {
    Array(snapshot.dogs.prefix(3))
  }

  private var overflow: Int {
    max(0, snapshot.count - dogs.count)
  }

  var body: some View {
    HStack(alignment: .center, spacing: 16) {
      VStack(alignment: .leading, spacing: 4) {
        BrandHeader()
        Text("\(snapshot.count)")
          .font(Brand.extraBold(40))
          .foregroundColor(Brand.pink)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
        Text(snapshot.message)
          .font(Brand.medium(13))
          .foregroundColor(Brand.text)
          .lineLimit(2)
          .minimumScaleFactor(0.85)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      HStack(alignment: .top, spacing: 12) {
        ForEach(Array(dogs.enumerated()), id: \.offset) { index, dog in
          VStack(spacing: 4) {
            AvatarView(
              image: index < entry.avatars.count ? entry.avatars[index] : nil,
              name: dog.name,
              size: 48
            )
            // The last caption carries the overflow so "+N" never gets
            // silently dropped on medium.
            if overflow > 0, index == dogs.count - 1 {
              Text("+\(overflow)")
                .font(Brand.bold(11))
                .foregroundColor(Brand.pink)
                .lineLimit(1)
            } else {
              Text(dog.name)
                .font(Brand.semiBold(11))
                .foregroundColor(Brand.text)
                .lineLimit(1)
            }
          }
          .frame(width: 52)
        }
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
      .widgetURL(messagesDeepLink)
      .containerBackground(for: .widget) {
        WidgetBackground()
      }
  }

  @ViewBuilder
  private var content: some View {
    if let snapshot = entry.snapshot, snapshot.loggedIn, snapshot.count > 0 {
      switch family {
      case .systemMedium:
        MediumMatchesView(entry: entry, snapshot: snapshot)
      default:
        SmallMatchesView(entry: entry, snapshot: snapshot)
      }
    } else if let snapshot = entry.snapshot, !snapshot.message.isEmpty {
      // Logged out or all caught up: message pre-localized by the app.
      EmptyStateView(message: snapshot.message)
    } else {
      EmptyStateView(message: L10n.placeholder)
    }
  }
}

@available(iOS 17.0, *)
struct MatchesWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: widgetKind, provider: MatchesProvider()) { entry in
      MatchesWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Pegada")
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
