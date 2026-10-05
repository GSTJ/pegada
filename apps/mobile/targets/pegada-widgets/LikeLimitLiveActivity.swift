import ActivityKit
import SwiftUI
import WidgetKit

private enum Palette {
  static let pink = Color("BrandPink")
}

struct LikeLimitLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LikeLimitActivityAttributes.self) { context in
      LockScreenView(context: context)
        .widgetURL(deepLink(for: context))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          StatusIcon(context: context, size: 28)
            .padding(.leading, 4)
            .accessibilityHidden(true)
        }
        DynamicIslandExpandedRegion(.trailing) {
          CountdownText(context: context)
            .font(.title2.weight(.bold))
            .foregroundStyle(Palette.pink)
            .frame(maxWidth: 76)
            .padding(.trailing, 4)
        }
        DynamicIslandExpandedRegion(.center) {
          StatusTitle(context: context)
            .font(.headline)
            .lineLimit(1)
            .accessibilityHidden(true)
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
        StatusIcon(context: context, size: 16)
          .accessibilityHidden(true)
      } compactTrailing: {
        CountdownText(context: context)
          .font(.caption2.weight(.semibold))
          .foregroundStyle(Palette.pink)
          .frame(maxWidth: 44)
      } minimal: {
        StatusIcon(context: context, size: 16)
          .accessibilityLabel(accessibilityStatus(for: context))
      }
      .widgetURL(deepLink(for: context))
      .keylineTint(Palette.pink)
    }
  }

  private func deepLink(for context: ActivityViewContext<LikeLimitActivityAttributes>) -> URL? {
    URL(string: context.attributes.deepLink)
  }
}

private struct LockScreenView: View {
  let context: ActivityViewContext<LikeLimitActivityAttributes>

  var body: some View {
    VStack(spacing: 12) {
      HStack(spacing: 12) {
        StatusIcon(context: context, size: 28)
          .frame(width: 40, height: 40)
          .accessibilityHidden(true)

        VStack(alignment: .leading, spacing: 2) {
          StatusTitle(context: context)
            .font(.headline)
            .accessibilityHidden(true)
          Text(context.attributes.body)
            .font(.caption)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }

        Spacer(minLength: 8)

        CountdownText(context: context)
          .font(.title2.weight(.bold))
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 88)
          .foregroundStyle(Palette.pink)
      }

      RechargeProgressBar(context: context)
    }
    .padding(16)
  }
}

private struct StatusIcon: View {
  let context: ActivityViewContext<LikeLimitActivityAttributes>
  let size: CGFloat

  var body: some View {
    Image(systemName: isReady(context) ? "checkmark.circle.fill" : "pawprint.fill")
      .font(.system(size: size, weight: .semibold))
      .foregroundStyle(Palette.pink)
  }
}

private struct StatusTitle: View {
  let context: ActivityViewContext<LikeLimitActivityAttributes>

  var body: some View {
    Text(isReady(context) ? context.attributes.readyLabel : context.attributes.title)
  }
}

private struct CountdownText: View {
  let context: ActivityViewContext<LikeLimitActivityAttributes>

  var body: some View {
    let now = Date()
    let ready = isReady(context, at: now)

    Group {
      if ready {
        Image(systemName: "checkmark.circle.fill")
          .accessibilityHidden(true)
      } else {
        Text(timerInterval: now...context.state.endDate, countsDown: true)
          .monospacedDigit()
      }
    }
    .lineLimit(1)
    .minimumScaleFactor(0.7)
    .accessibilityLabel(accessibilityStatus(for: context, at: now))
    .accessibilityValue(accessibilityCountdownValue(for: context, at: now))
  }
}

private struct RechargeProgressBar: View {
  let context: ActivityViewContext<LikeLimitActivityAttributes>

  var body: some View {
    let start = min(context.attributes.startDate, context.state.endDate)
    let end = max(context.state.endDate, start.addingTimeInterval(1))

    ProgressView(
      timerInterval: start...end,
      countsDown: false,
      label: { EmptyView() },
      currentValueLabel: { EmptyView() }
    )
    .progressViewStyle(.linear)
    .tint(Palette.pink)
    .accessibilityHidden(true)
  }
}

private func isReady(
  _ context: ActivityViewContext<LikeLimitActivityAttributes>,
  at date: Date = Date()
) -> Bool {
  context.isStale || context.state.endDate <= date
}

private func accessibilityStatus(
  for context: ActivityViewContext<LikeLimitActivityAttributes>,
  at date: Date = Date()
) -> Text {
  if isReady(context, at: date) {
    return Text(context.attributes.readyLabel)
  }

  return Text(context.attributes.title)
}

private func accessibilityCountdownValue(
  for context: ActivityViewContext<LikeLimitActivityAttributes>,
  at date: Date = Date()
) -> Text {
  if isReady(context, at: date) {
    return Text("")
  }

  return Text(timerInterval: date...context.state.endDate, countsDown: true)
}
