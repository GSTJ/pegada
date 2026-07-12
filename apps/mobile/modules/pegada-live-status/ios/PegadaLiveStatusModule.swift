import ExpoModulesCore

#if canImport(ActivityKit)
  import ActivityKit
#endif

struct LiveStatusCountdownOptions: Record {
  @Field var title: String = ""
  @Field var body: String = ""
  @Field var readyLabel: String = ""
  @Field var startTimeMillis: Double = 0
  @Field var endTimeMillis: Double = 0
  @Field var deepLink: String = ""
  // Android-only, accepted here so both platforms share one JS call shape.
  @Field var channelName: String = ""
}

public class PegadaLiveStatusModule: Module {
  public func definition() -> ModuleDefinition {
    Name("PegadaLiveStatus")

    Function("isSupported") { () -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return ActivityAuthorizationInfo().areActivitiesEnabled
    }

    AsyncFunction("startLikeCountdown") { (options: LiveStatusCountdownOptions) async throws in
      guard #available(iOS 16.2, *) else { return }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }

      let endDate = Date(timeIntervalSince1970: options.endTimeMillis / 1000)
      guard endDate > Date() else { return }

      // Never stack countdowns: a fresh start replaces any live one.
      await Self.endAllActivities()

      let startDate = Date(timeIntervalSince1970: options.startTimeMillis / 1000)
      let attributes = LikeLimitActivityAttributes(
        title: options.title,
        body: options.body,
        readyLabel: options.readyLabel,
        startDate: min(startDate, Date()),
        deepLink: options.deepLink
      )
      let state = LikeLimitActivityAttributes.ContentState(endDate: endDate)
      // staleDate: once the timer hits zero the activity is outdated -
      // the system dims it until the app ends it on next launch.
      let content = ActivityContent(state: state, staleDate: endDate, relevanceScore: 100)

      _ = try Activity<LikeLimitActivityAttributes>.request(
        attributes: attributes,
        content: content,
        pushType: nil
      )
    }

    AsyncFunction("endLikeCountdown") { () async in
      guard #available(iOS 16.2, *) else { return }
      await Self.endAllActivities()
    }
  }

  @available(iOS 16.2, *)
  private static func endAllActivities() async {
    for activity in Activity<LikeLimitActivityAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }
}
