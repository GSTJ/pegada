import type { LocalImageProps } from "@/components/image";
import type { AnimatedProps } from "react-native-reanimated";

import type {
  PressableProps,
  StyleProp,
  ViewProps,
  ViewStyle,
} from "react-native";

import Color from "color";
import Animated from "react-native-reanimated";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

// Should preload for a better dog experience, so no inline requires
import confusedEmoji from "@/assets/images/ConfusedEmoji.webp";
import heartEyesEmoji from "@/assets/images/HeartEyesEmoji.webp";
import thinkingEmoji from "@/assets/images/ThinkingEmoji.webp";
import { Image } from "@/components/image";
import { PressableArea } from "@/components/pressable-area";

// Apple HIG recommends a minimum 44x44pt hit area for tappable targets.
const MIN_TOUCH_TARGET = 44;

/**
 * Hit target expansion so taps that land just outside the visible button still
 * register on the action, never falling through to the card's PersonalInfo
 * pressable underneath (which would open the dog profile instead).
 */
const ACTION_ITEM_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

/** Neither `PressableArea` nor `expo-image` is autoprocessed. */
const ThemedPressableArea = withUnistyles(PressableArea);
const ThemedImage = withUnistyles(Image);

/**
 * These stay components rather than becoming bare style objects: `index.tsx`
 * types its own props off `typeof Container`, and `Messages/components/Message`
 * picks `ThinkingEmoji` at runtime and renders it by value.
 *
 * The `.attrs` defaults were static objects, so they still beat the caller:
 * they sit after the spread, exactly where `.attrs` used to put them.
 */
export const Container = ({ style, ...props }: AnimatedProps<ViewProps>) => (
  <Animated.View
    {...props}
    // box-none keeps the bar itself non-blocking so the card below stays
    // pannable in the gaps, but lifts the bar above the card visually so
    // each ActionItem reliably wins taps over the card's PersonalInfo
    // pressable that sits underneath.
    pointerEvents="box-none"
    style={[styles.container, style]}
  />
);

/** `Pressable` also accepts a style callback; composing needs a plain style. */
type ActionItemProps = { style?: StyleProp<ViewStyle> } & Omit<
  PressableProps,
  "style"
>;

export const ActionItem = ({ style, ...props }: ActionItemProps) => (
  <ThemedPressableArea
    {...props}
    hitSlop={ACTION_ITEM_HIT_SLOP}
    style={[styles.actionItem, style]}
  />
);

export const ConfusedEmoji = ({ style, ...props }: LocalImageProps) => (
  <ThemedImage
    {...props}
    source={confusedEmoji}
    style={[styles.confusedEmoji, style]}
  />
);

export const ThinkingEmoji = ({ style, ...props }: LocalImageProps) => (
  <ThemedImage
    {...props}
    source={thinkingEmoji}
    style={[styles.thinkingEmoji, style]}
  />
);

/** `styled(ConfusedEmoji)`: the same 55x55 box, with the source swapped. */
export const HeartEyesEmoji = ({ style, ...props }: LocalImageProps) => (
  <ThemedImage
    {...props}
    source={heartEyesEmoji}
    style={[styles.heartEyesEmoji, style]}
  />
);

const styles = StyleSheet.create((theme) => ({
  container: {
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
    flexDirection: "row",
    position: "absolute",
    alignSelf: "center",
    bottom: theme.spacing[6],
    paddingTop: 0,
    paddingRight: theme.spacing[2],
    paddingBottom: 0,
    paddingLeft: theme.spacing[2],
    zIndex: 10,
    elevation: 10,
  },
  actionItem: {
    paddingTop: theme.spacing[2.5],
    paddingRight: theme.spacing[2.5],
    paddingBottom: theme.spacing[2.5],
    paddingLeft: theme.spacing[2.5],
    backgroundColor: new Color(theme.colors.primary).alpha(0.1).rgb().string(),
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    // Guarantee the Apple HIG minimum even when the emoji shrinks.
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: "center",
    justifyContent: "center",
  },
  confusedEmoji: {
    width: 55,
    height: 55,
  },
  thinkingEmoji: {
    width: 35,
    height: 35,
  },
  heartEyesEmoji: {
    width: 55,
    height: 55,
  },
}));
