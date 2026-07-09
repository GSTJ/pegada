import { useTranslation } from "react-i18next";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTheme } from "styled-components/native";

/**
 * Native Tabs (`expo-router/unstable-native-tabs`) hand the tab bar to
 * UIKit, which is what gets us Liquid Glass for free on iOS 26 (and the
 * standard native tab bar on iOS 18 and below -- there's no flag to
 * toggle, it's automatic based on the OS the app is running on).
 *
 * Icons: Native Tabs only accept SF Symbols, xcasset images, drawable/
 * material resources, or static image sources for the icon prop -- not
 * arbitrary SVG element trees like our gradient `Logo`/`Messages`/`Profile`
 * components (only `VectorIcon` is supported as a React element). Native
 * platform tab bars render icons as flat, tinted glyphs by convention
 * anyway (that's part of what makes Liquid Glass read correctly), so a
 * gradient icon would look out of place here even if the API allowed it.
 * SF Symbols were picked to match each icon's original silhouette:
 * `pawprint` for Swipe (the paw mark in the SVG logo), `message` for
 * Messages, `person.circle` for Profile.
 *
 * Labels: preserved exactly as today (hidden, icon-only tab bar) via
 * `Label hidden`. Note that expo-router's Native Tabs don't forward an
 * accessibility label when the visible label is hidden (the `hidden` prop
 * makes the title an empty string, full stop), so the localized copy is
 * passed again via `unstable_nativeProps.tabBarItemAccessibilityLabel`
 * (the underlying `react-native-screens` prop) to keep VoiceOver
 * announcing a real name instead of nothing.
 */
export default () => {
  const theme = useTheme();
  const { t } = useTranslation();

  // The app has a manual theme system (light/dark/system) that overrides the
  // OS scheme via `Appearance.setColorScheme`, but that only affects the JS
  // side -- UIKit traits don't change, so the Liquid Glass tab bar would
  // follow the OS and render light glass in in-app dark mode (and vice
  // versa). `experimental_userInterfaceStyle` sets
  // `overrideUserInterfaceStyle` on the native bar so the glass follows the
  // APP theme, same as GlassView's `colorScheme` elsewhere in the branch.
  const userInterfaceStyle = theme.dark ? ("dark" as const) : ("light" as const);

  return (
    <NativeTabs
      tintColor={theme.colors.primary}
      iconColor={theme.colors.text}
      backgroundColor={theme.colors.background}
    >
      <NativeTabs.Trigger
        name="swipe"
        unstable_nativeProps={{
          tabBarItemTestID: "tab-swipe",
          tabBarItemAccessibilityLabel: t("tabs.swipe"),
          experimental_userInterfaceStyle: userInterfaceStyle,
        }}
      >
        <NativeTabs.Trigger.Icon sf={{ default: "pawprint", selected: "pawprint.fill" }} />
        <NativeTabs.Trigger.Label hidden>{t("tabs.swipe")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="messages"
        unstable_nativeProps={{
          tabBarItemTestID: "tab-messages",
          tabBarItemAccessibilityLabel: t("tabs.messages"),
          experimental_userInterfaceStyle: userInterfaceStyle,
        }}
      >
        <NativeTabs.Trigger.Icon sf={{ default: "message", selected: "message.fill" }} />
        <NativeTabs.Trigger.Label hidden>{t("tabs.messages")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="profile"
        unstable_nativeProps={{
          tabBarItemTestID: "tab-profile",
          tabBarItemAccessibilityLabel: t("tabs.profile"),
          experimental_userInterfaceStyle: userInterfaceStyle,
        }}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: "person.circle", selected: "person.circle.fill" }}
        />
        <NativeTabs.Trigger.Label hidden>{t("tabs.profile")}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};
