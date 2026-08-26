import Animated from "react-native-reanimated";
import {
  createUnistylesElement,
  StyleSheet,
  withUnistyles,
} from "react-native-unistyles";

import Dog from "@/assets/images/Dog.svg";
import { Image } from "@/components/image";
import { PressableArea } from "@/components/pressable-area";
import { width } from "@/constants";

export const containerPadding = 16;
export const numOfColumns = 3;
export const dogPictureWidth = (width - containerPadding * 2) / numOfColumns;
export const dogPictureHeight = dogPictureWidth * 1.3;

const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * `Animated.createAnimatedComponent(Image)` is off the babel plugin's
 * autoprocess list, so it has to be registered by hand.
 * `createUnistylesElement` — the wrapper the plugin applies to `Animated.View`
 * and friends — is what that takes: unlike `withUnistyles` it forwards the
 * props untouched instead of flattening `style` into one object, which is what
 * keeps reanimated's own props (and any style array a caller passes) intact.
 */
export const UserPicture = createUnistylesElement(
  AnimatedImage,
) as typeof AnimatedImage;

export const AddRemoveContainer = withUnistyles(PressableArea);

export const FadedDog = withUnistyles(Dog);

export const MaestroSkipPressable = withUnistyles(PressableArea);

const DEBUG_IMAGE_STATUS_CONTAINER_BACKGROUND_COLOR = "rgba(0, 0, 0, 0.7)";
const ANIMATED_OVERLAY_BACKGROUND_COLOR = "#00000050";
const ADD_REMOVE_CONTAINER_BORDER_COLOR = "black";

export const styles = StyleSheet.create((theme) => ({
  debugImageStatusContainer: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    right: 0,
    paddingTop: theme.spacing[1],
    paddingRight: theme.spacing[1],
    paddingBottom: theme.spacing[1],
    paddingLeft: theme.spacing[1],
    borderBottomLeftRadius: theme.radii.sm,
    backgroundColor: DEBUG_IMAGE_STATUS_CONTAINER_BACKGROUND_COLOR,
  },
  userPictureContent: {
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    borderWidth: theme.stroke.md,
    borderColor: theme.colors.border,
    borderStyle: "solid",
    backgroundColor: theme.colors.input,
  },
  animatedOverlay: {
    backgroundColor: ANIMATED_OVERLAY_BACKGROUND_COLOR,
    width: "100%",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    justifyContent: "center",
  },
  userPicture: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  userPictureContainer: {
    paddingTop: theme.spacing[1.5],
    paddingRight: theme.spacing[1.5],
    paddingBottom: theme.spacing[1.5],
    paddingLeft: theme.spacing[1.5],
    width: dogPictureWidth,
    height: dogPictureHeight,
  },
  addRemoveContainer: {
    borderTopLeftRadius: theme.radii.round,
    borderTopRightRadius: theme.radii.round,
    borderBottomRightRadius: theme.radii.round,
    borderBottomLeftRadius: theme.radii.round,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: theme.stroke.md,
    // What `border: <width>px` on its own gives; both buckets below overwrite
    // it, exactly as the `border-color` declaration after it did.
    borderColor: ADD_REMOVE_CONTAINER_BORDER_COLOR,
    borderStyle: "solid",
    variants: {
      inverted: {
        true: {
          backgroundColor: theme.colors.input,
          borderColor: theme.colors.border,
        },
        default: {
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.primary,
        },
      },
    },
  },
  fadedDog: {
    opacity: 0.5,
  },
  /**
   * MAESTRO_E2E placeholder skip button. Visible but unobtrusive — pinned to
   * the bottom edge of the photo cell so a Maestro `point` tap can target it
   * without occluding the centered FadedDog (which is the real human tap
   * target on non-Maestro runs). Rendered only when both gates pass in
   * `AddUserPhoto.showMaestroSkip` — production builds short-circuit on
   * `config.ENV === "production"` so they never instantiate this style.
   */
  maestroSkipPressable: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    // Must win hit-testing over the sibling FadedDog PressableArea and its
    // generous hitSlop — without this, taps on the pill open the regular
    // image-picker dialog instead (verified on iPhone 17 Pro Max sim).
    zIndex: 10,
    paddingTop: 4,
    paddingRight: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DEBUG_IMAGE_STATUS_CONTAINER_BACKGROUND_COLOR,
  },
}));
