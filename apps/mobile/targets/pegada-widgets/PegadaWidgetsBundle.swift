import SwiftUI
import WidgetKit

// The ONE widget-extension bundle for the whole app (iOS allows a single
// widget extension per app). Every widget-family feature registers itself
// here, one entry per line, so cross-branch merges stay simple line unions.
@main
struct PegadaWidgetsBundle: WidgetBundle {
  var body: some Widget {
    if #available(iOS 17.0, *) {
      MatchesWidget()
    }
  }
}
