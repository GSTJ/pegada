import SwiftUI
import WidgetKit

// The target's deployment target is iOS 16.2, so ActivityKit is always
// available here; the main app gates start/end calls at runtime instead.
@main
struct LikeLimitActivityBundle: WidgetBundle {
  var body: some Widget {
    LikeLimitLiveActivity()
  }
}
