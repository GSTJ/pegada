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
          Color("BrandPink").opacity(0.18)
          Text(name.prefix(1).uppercased())
            .font(.system(size: size * 0.42, weight: .bold, design: .rounded))
            .foregroundColor(Color("BrandPink"))
        }
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
    .overlay(Circle().strokeBorder(Color("$widgetBackground"), lineWidth: 2))
  }
}

struct AvatarStack: View {
  let entry: MatchesEntry
  let size: CGFloat

  private var dogs: [SnapshotDog] {
    Array(entry.snapshot?.dogs.prefix(3) ?? [])
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
    }
  }
}

struct BrandHeader: View {
  var body: some View {
    HStack(spacing: 4) {
      Text("🐾")
        .font(.system(size: 12))
      Text("Pegada")
        .font(.system(size: 13, weight: .heavy, design: .rounded))
        .foregroundColor(Color("BrandPink"))
    }
  }
}

struct EmptyStateView: View {
  let message: String

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      BrandHeader()
      Spacer(minLength: 0)
      Text("🐶")
        .font(.system(size: 28))
      Text(message)
        .font(.system(size: 13, weight: .medium, design: .rounded))
        .foregroundColor(Color("PrimaryText"))
        .lineLimit(3)
        .minimumScaleFactor(0.8)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

struct SmallMatchesView: View {
  let entry: MatchesEntry
  let snapshot: MatchesSnapshot

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      BrandHeader()
      Spacer(minLength: 0)
      HStack(alignment: .center, spacing: 8) {
        AvatarStack(entry: entry, size: 40)
        if snapshot.count > min(snapshot.dogs.count, 3) {
          Text("+\(snapshot.count - min(snapshot.dogs.count, 3))")
            .font(.system(size: 16, weight: .bold, design: .rounded))
            .foregroundColor(Color("BrandPink"))
        }
      }
      Text(snapshot.message)
        .font(.system(size: 12, weight: .medium, design: .rounded))
        .foregroundColor(Color("PrimaryText"))
        .lineLimit(2)
        .minimumScaleFactor(0.8)
      Spacer(minLength: 0)
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

  var body: some View {
    HStack(alignment: .center, spacing: 16) {
      VStack(alignment: .leading, spacing: 6) {
        BrandHeader()
        Text("\(snapshot.count)")
          .font(.system(size: 40, weight: .heavy, design: .rounded))
          .foregroundColor(Color("BrandPink"))
        Text(snapshot.message)
          .font(.system(size: 13, weight: .medium, design: .rounded))
          .foregroundColor(Color("PrimaryText"))
          .lineLimit(2)
          .minimumScaleFactor(0.8)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

      HStack(spacing: 12) {
        ForEach(Array(dogs.enumerated()), id: \.offset) { index, dog in
          VStack(spacing: 4) {
            AvatarView(
              image: index < entry.avatars.count ? entry.avatars[index] : nil,
              name: dog.name,
              size: 48
            )
            Text(dog.name)
              .font(.system(size: 11, weight: .semibold, design: .rounded))
              .foregroundColor(Color("PrimaryText"))
              .lineLimit(1)
          }
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

struct MatchesWidgetEntryView: View {
  @Environment(\.widgetFamily) private var family

  let entry: MatchesEntry

  var body: some View {
    content
      .widgetURL(messagesDeepLink)
      .containerBackground(for: .widget) {
        Color("$widgetBackground")
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
