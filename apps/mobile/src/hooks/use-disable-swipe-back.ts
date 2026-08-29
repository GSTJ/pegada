import { useNavigation } from "expo-router";

/**
 * A drag-based control (slider, photo reorder) and the stack's native
 * swipe-back gesture are independent recognizers on the same screen — one
 * touch can be claimed by either, and the control's own pan responder
 * doesn't block it. Call the returned setter around a drag's start/end so
 * the control wins for its duration.
 */
export const useDisableSwipeBack = () => {
  const navigation = useNavigation();

  return (gestureEnabled: boolean) => {
    // Routed through a variable: `setOptions` isn't typed with
    // `gestureEnabled` here since `useNavigation()` doesn't know it's on a
    // native-stack screen, and an inline object literal would fail
    // TypeScript's excess-property check against that looser type.
    const options: { gestureEnabled: boolean } = { gestureEnabled };
    navigation.setOptions(options);
  };
};
