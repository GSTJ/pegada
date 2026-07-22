import ExpoModulesCore
import WidgetKit

/// Keep in sync with `modules/pegada-widget/index.ts` and
/// `targets/pegada-widgets/MatchesWidget.swift`.
private let appGroupId = "group.app.pegada"
private let snapshotKey = "matchesWidgetSnapshot"
private let widgetKind = "PegadaMatchesWidget"

public class PegadaWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PegadaWidget")

    AsyncFunction("setSnapshot") { (json: String) in
      guard let defaults = UserDefaults(suiteName: appGroupId) else {
        throw MissingAppGroupException()
      }

      defaults.set(json, forKey: snapshotKey)
      WidgetCenter.shared.reloadTimelines(ofKind: widgetKind)
    }
  }
}

internal final class MissingAppGroupException: Exception {
  override var reason: String {
    "Could not open the '\(appGroupId)' App Group. Is the entitlement configured?"
  }
}
