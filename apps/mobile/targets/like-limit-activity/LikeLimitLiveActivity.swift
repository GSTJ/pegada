import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Palette

private enum Palette {
  /// Pegada brand pink (#EE61A1).
  static let pink = Color(red: 238 / 255, green: 97 / 255, blue: 161 / 255)
  static let pinkSoft = pink.opacity(0.18)
}

// MARK: - Widget

struct LikeLimitLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LikeLimitActivityAttributes.self) { context in
      LockScreenView(context: context)
        .widgetURL(deepLink(for: context))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          PawBadge(size: 40)
            .padding(.leading, 4)
        }
        DynamicIslandExpandedRegion(.trailing) {
          CountdownText(context: context)
            .font(.title2.weight(.bold))
            .foregroundStyle(Palette.pink)
            .frame(maxWidth: 72)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.title)
            .font(.headline)
            .lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(alignment: .leading, spacing: 6) {
            RechargeProgressBar(context: context)
            Text(context.attributes.body)
              .font(.caption)
              .foregroundStyle(.secondary)
              .lineLimit(1)
          }
          .padding(.horizontal, 4)
        }
      } compactLeading: {
        Image(systemName: "pawprint.fill")
          .foregroundStyle(Palette.pink)
      } compactTrailing: {
        CountdownText(context: context)
          .font(.caption2.weight(.semibold))
          .foregroundStyle(Palette.pink)
          .frame(maxWidth: 44)
      } minimal: {
        Image(systemName: "pawprint.fill")
          .foregroundStyle(Palette.pink)
      }
      .widgetURL(deepLink(for: context))
      .keylineTint(Palette.pink)
    }
  }

  private func deepLink(for context: ActivityViewContext<LikeLimitActivityAttributes>) -> URL? {
    URL(string: context.attributes.deepLink)
  }
}

// MARK: - Lock screen / banner

private struct LockScreenView: View {
  let context: ActivityViewContext<LikeLimitActivityAttributes>

  var body: some View {
    VStack(spacing: 12) {
      HStack(spacing: 12) {
        PawBadge(size: 44)

        VStack(alignment: .leading, spacing: 2) {
          Text(context.attributes.title)
            .font(.headline)
          Text(context.attributes.body)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }

        Spacer(minLength: 8)

        CountdownText(context: context)
          .font(.title2.weight(.bold))
          .monospacedDigit()
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 84)
          .foregroundStyle(Palette.pink)
      }

      RechargeProgressBar(context: context)
    }
    .padding(16)
    .activitySystemActionForegroundColor(Palette.pink)
  }
}

// MARK: - Pieces

private struct PawBadge: View {
  var size: CGFloat

  var body: some View {
    ZStack {
      Circle()
        .fill(Palette.pinkSoft)
      Image(systemName: "pawprint.fill")
        .font(.system(size: size * 0.5, weight: .semibold))
        .foregroundStyle(Palette.pink)
    }
    .frame(width: size, height: size)
  }
}

/// Auto-updating countdown; switches to the "ready" label once the
/// activity goes stale (the timer ended while the app was closed).
private struct CountdownText: View {
  let context: ActivityViewContext<LikeLimitActivityAttributes>

  var body: some View {
    if context.isStale || context.state.endDate <= Date() {
      Text(context.attributes.readyLabel)
        .font(.caption.weight(.semibold))
        .minimumScaleFactor(0.6)
    } else {
      Text(timerInterval: Date()...context.state.endDate, countsDown: true)
        .monospacedDigit()
    }
  }
}

/// Determinate progress across the 24h like-limit window, animated by the
/// system without any app process running.
private struct RechargeProgressBar: View {
  let context: ActivityViewContext<LikeLimitActivityAttributes>

  var body: some View {
    let end = max(context.state.endDate, context.attributes.startDate.addingTimeInterval(1))

    ProgressView(
      timerInterval: context.attributes.startDate...end,
      countsDown: false,
      label: { EmptyView() },
      currentValueLabel: { EmptyView() }
    )
    .progressViewStyle(.linear)
    .tint(Palette.pink)
  }
}
