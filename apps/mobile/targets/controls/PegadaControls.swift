import AppIntents
import SwiftUI
import WidgetKit

/// Deep-links straight into the swipe deck. This intent runs inside the
/// widget extension process, so the app is opened through an `OpenURLIntent`
/// result (UIApplication is not available in extensions). The pegada://
/// scheme is handled by expo-router in the main app.
struct StartSwipingControlIntent: AppIntent {
  static let title: LocalizedStringResource = "Start Swiping"
  static let description = IntentDescription("Opens Pegada ready to meet new dogs.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult & OpensIntent {
    // Compile-time constant, always a valid URL.
    .result(opensIntent: OpenURLIntent(URL(string: "pegada://swipe")!))
  }
}

/// Control Center button (iOS 18+): a paw that launches the swipe screen.
/// Strings are localized via this target's Localizable.xcstrings (en + pt-BR).
struct StartSwipingControl: ControlWidget {
  static let kind = "app.pegada.controls.startswiping"

  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: Self.kind) {
      ControlWidgetButton(action: StartSwipingControlIntent()) {
        Label("Start Swiping", systemImage: "pawprint.fill")
      }
    }
    .displayName("Start Swiping")
    .description("Jump straight into meeting new dogs.")
  }
}

@main
struct PegadaControlsBundle: WidgetBundle {
  var body: some Widget {
    StartSwipingControl()
  }
}
