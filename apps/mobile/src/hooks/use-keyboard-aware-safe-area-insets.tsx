import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The safe-area insets, with the bottom one dropped while the keyboard is up.
 *
 * The bottom inset exists to keep content clear of the home indicator or the
 * gesture-nav pill. Both are drawn *over* the keyboard, so once it is up the
 * inset is padding against something that is no longer there — which is what
 * left a visible gap under the chat composer and the pinned action bars.
 *
 * `keyboardWillShow`/`keyboardWillHide` are iOS-only events. Listening to just
 * those meant this hook never fired on Android at all, so the gap was there on
 * every Android screen that uses it. `keyboardDidShow`/`keyboardDidHide` do
 * exist on both, but on iOS they land after the avoidance animation has
 * finished, and the inset would visibly pop a frame late.
 */
export const useKeyboardAwareSafeAreaInsets = () => {
  const insets = useSafeAreaInsets();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const [showEvent, hideEvent] =
      Platform.OS === "ios"
        ? (["keyboardWillShow", "keyboardWillHide"] as const)
        : (["keyboardDidShow", "keyboardDidHide"] as const);

    const subscriptions = [
      Keyboard.addListener(showEvent, () => setKeyboardOpen(true)),
      Keyboard.addListener(hideEvent, () => setKeyboardOpen(false)),
    ];

    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, []);

  return {
    top: insets.top,
    right: insets.right,
    left: insets.left,
    bottom: keyboardOpen ? 0 : insets.bottom,
  };
};
