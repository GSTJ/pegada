import Foundation

#if canImport(ActivityKit)
  import ActivityKit

  /// Shared ActivityAttributes for the like-limit countdown Live Activity.
  ///
  /// IMPORTANT: this struct is duplicated verbatim in
  /// `targets/pegada-widgets/LikeLimitActivityAttributes.swift`.
  /// ActivityKit matches app <-> widget-extension activities by the
  /// attribute type's name and its Codable encoding, so both copies must
  /// stay identical. If you change one, change the other.
  @available(iOS 16.2, *)
  struct LikeLimitActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
      /// When the user's free likes come back.
      var endDate: Date
    }

    /// Localized title, provided by JS (e.g. "Likes recharging").
    var title: String
    /// Localized supporting line, provided by JS.
    var body: String
    /// Localized label shown when the countdown has finished ("Likes are back!").
    var readyLabel: String
    /// Start of the 24h window, used to render determinate progress.
    var startDate: Date
    /// URL opened when the activity is tapped (expo-router deep link).
    var deepLink: String
  }
#endif
