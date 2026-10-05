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

    AsyncFunction("startLikeCountdown") {
      (options: LiveStatusCountdownOptions) async throws -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }

      let endDate = Date(timeIntervalSince1970: options.endTimeMillis / 1000)
      let remainingDuration = endDate.timeIntervalSinceNow
      guard remainingDuration > 0, remainingDuration <= Self.maximumRelevantDuration else {
        return false
      }

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
      let content = ActivityContent(state: state, staleDate: endDate, relevanceScore: 0)

      let activity = try Activity<LikeLimitActivityAttributes>.request(
        attributes: attributes,
        content: content,
        pushType: nil
      )
      Self.store(endDate: endDate)
      Self.scheduleEnd(of: activity, at: endDate)
      return true
    }

    AsyncFunction("endLikeCountdown") { () async in
      guard #available(iOS 16.2, *) else { return }
      await Self.endAllActivities()
    }

    AsyncFunction("reconcileLikeCountdown") { () async -> Double? in
      guard #available(iOS 16.2, *) else { return nil }
      return await Self.reconcileActivities()
    }
  }

  private static let maximumRelevantDuration: TimeInterval = 8 * 60 * 60
  private static let storedEndTimeKey = "pegada.like-limit.end-time"

  @available(iOS 16.2, *)
  private static func endAllActivities() async {
    for activity in Activity<LikeLimitActivityAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
    UserDefaults.standard.removeObject(forKey: storedEndTimeKey)
  }

  @available(iOS 16.2, *)
  private static func reconcileActivities() async -> Double? {
    let now = Date()
    let activities = Activity<LikeLimitActivityAttributes>.activities
    let validActivities = activities.filter { activity in
      let endDate = activity.content.state.endDate
      let remainingDuration = endDate.timeIntervalSince(now)
      return remainingDuration > 0 && remainingDuration <= maximumRelevantDuration
    }
    let keeper = validActivities.max { first, second in
      first.content.state.endDate < second.content.state.endDate
    }

    for activity in activities where activity.id != keeper?.id {
      await activity.end(nil, dismissalPolicy: .immediate)
    }

    if let keeper {
      let endDate = keeper.content.state.endDate
      store(endDate: endDate)
      scheduleEnd(of: keeper, at: endDate)
      return endDate.timeIntervalSince1970 * 1000
    }

    // If a future end time remains without an Activity, the person dismissed
    // it. Preserve that logical countdown so repeated blocked swipes do not
    // immediately recreate a surface they removed.
    let storedEndTime = UserDefaults.standard.double(forKey: storedEndTimeKey)
    if storedEndTime > now.timeIntervalSince1970 {
      return storedEndTime * 1000
    }

    UserDefaults.standard.removeObject(forKey: storedEndTimeKey)
    return nil
  }

  private static func store(endDate: Date) {
    UserDefaults.standard.set(endDate.timeIntervalSince1970, forKey: storedEndTimeKey)
  }

  @available(iOS 16.2, *)
  private static func scheduleEnd(
    of activity: Activity<LikeLimitActivityAttributes>,
    at endDate: Date
  ) {
    let delay = endDate.timeIntervalSinceNow
    guard delay > 0 else { return }

    Task {
      try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
      await activity.end(nil, dismissalPolicy: .immediate)

      // A newer countdown may have replaced this one while the task slept.
      // Only clear persistence if it still belongs to this exact activity.
      let storedEndTime = UserDefaults.standard.double(forKey: storedEndTimeKey)
      if abs(storedEndTime - endDate.timeIntervalSince1970) < 0.001 {
        UserDefaults.standard.removeObject(forKey: storedEndTimeKey)
      }
    }
  }
}
