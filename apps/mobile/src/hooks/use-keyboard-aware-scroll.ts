import type {
  HostInstance,
  KeyboardEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
} from "react-native";

import * as React from "react";
import {
  Dimensions,
  Keyboard,
  LayoutAnimation,
  Platform,
  TextInput,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Breathing room left between the focused input's bottom edge and the top of
 * whatever is pinned over the scroll area (the BottomAction bar). Half a
 * spacing step is enough to prove the field is clear rather than flush.
 */
const FOCUS_CLEARANCE = 8;

/**
 * The keyboard-avoidance mechanics settle over two frames on iOS (the
 * `KeyboardAvoidingView` padding animates alongside the keyboard) and over a
 * window resize on Android. `keyboardDidShow` fires at the end of that on both
 * platforms, but the shrunken layout is not always committed by the time the
 * listener runs — so every request is retried once, a few frames later. The
 * measurement is idempotent: the retry is a no-op when the first pass already
 * put the field on screen.
 */
const RETRY_DELAY_MS = 120;

/**
 * `box` is the focused field's outer, padded container. React Native measures
 * a `TextInput` as its *text* frame, so scrolling to that alone leaves the
 * rounded box's bottom padding under whatever is pinned over the scroll area —
 * which is the "sliced bottom edge" half of the bug. Callers that know their
 * box hand it over; callers that don't fall back to the text frame.
 */
type RequestScrollIntoView = (box?: HostInstance | null) => void;

const noop: RequestScrollIntoView = () => {};

const ScrollIntoViewContext = React.createContext<RequestScrollIntoView>(noop);

/**
 * Lets any `Input` under a keyboard-aware scroll area ask to be scrolled into
 * view when it takes focus. Outside such an area the default is a no-op, so
 * the primitive stays usable anywhere.
 */
export const useRequestScrollIntoView = () =>
  React.useContext(ScrollIntoViewContext);

export const ScrollIntoViewProvider = ScrollIntoViewContext.Provider;

/**
 * How much of the window's bottom edge the soft keyboard covers, in dp.
 *
 * Spread the returned value as `paddingBottom` on whatever reaches the bottom
 * of the window and the screen shrinks to the part the user can still see —
 * pinned bars ride up, `position: absolute; bottom: 0` composers ride up, and
 * `useKeyboardAwareScroll` below measures a container that already excludes
 * the keyboard. That is the same guarantee `KeyboardAvoidingView` gives with
 * `behavior="padding"`, and the arithmetic is deliberately identical to its
 * `_relativeKeyboardHeight` — but it holds on Android, where the component
 * gives none.
 *
 * Why the component does not: the app is edge-to-edge
 * (`react-native-edge-to-edge`), and from Android 15 that makes
 * `android:windowSoftInputMode="adjustResize"` a no-op. The window keeps its
 * full height and the IME arrives as a window inset the app must consume, so
 * every screen here passed `behavior={Platform.OS === "ios" ? "padding" :
 * undefined}` — nothing at all on Android. Measured on an API 36 emulator with
 * the keyboard up: the app window is still [0,0][1080,2400] while the ime
 * InsetsSource covers [0,1517][1080,2400].
 *
 * The two platforms read different halves of the same event because React
 * Native fills them in differently:
 *
 *  * iOS reports the keyboard's own top edge in `screenY`, so the covered
 *    height is the window height minus it. `keyboardWillChangeFrame` covers
 *    show, hide and every resize in between (an autocomplete bar appearing,
 *    a hardware keyboard connecting), and reports `screenY` at the window's
 *    bottom when the keyboard goes away — so hide needs no special case.
 *  * Android's `ReactRootView` sets `screenY` to the bottom of the window's
 *    *visible display frame*, which is only the keyboard's top edge if the
 *    window resized — i.e. never, here. Its `height` is honest, though:
 *    `imeInsets.bottom - systemBarInsets.bottom`. Adding the bottom safe-area
 *    inset back gives the full inset the IME occupies, which is the number
 *    this hook is about.
 */
export const useKeyboardOverlap = () => {
  const insets = useSafeAreaInsets();

  // Seeded, not zero: `keyboardDidShow` fires when the keyboard APPEARS, and a
  // screen can be entered with it already up — sign-in's email field is
  // focused, tapping Continue pushes the one-time-code screen, focus moves
  // from one field straight to another and the IME never leaves. No event
  // fires, and a hook that only listens would leave that screen padded by 0
  // with its resend control behind the keypad. `Keyboard.metrics()` is React
  // Native's own record of the last `keyboardDidShow` (nulled on hide), which
  // is exactly the state this needs to catch up to. Computed lazily so the
  // first committed frame is already correct rather than flashing unpadded.
  const [overlap, setOverlap] = React.useState(() => {
    const metrics = Keyboard.metrics();
    if (!metrics) return 0;

    return Platform.OS === "ios"
      ? Math.max(0, Dimensions.get("window").height - metrics.screenY)
      : metrics.height + insets.bottom;
  });

  // Read at event time, not captured: re-subscribing on every inset change
  // would drop the listener for a frame mid-animation.
  const bottomInsetRef = React.useRef(insets.bottom);
  bottomInsetRef.current = insets.bottom;

  React.useEffect(() => {
    const apply = (next: number, event?: KeyboardEvent) => {
      // Ride the keyboard's own curve rather than snapping a frame early or
      // late. This is what KeyboardAvoidingView does, and dropping it is
      // visible on iOS as a jump.
      if (event?.duration && event.easing) {
        LayoutAnimation.configureNext({
          duration: event.duration > 10 ? event.duration : 10,
          update: { duration: event.duration, type: event.easing },
        });
      }
      setOverlap((current) => (current === next ? current : next));
    };

    if (Platform.OS === "ios") {
      const subscription = Keyboard.addListener(
        "keyboardWillChangeFrame",
        (event) => {
          const covered =
            Dimensions.get("window").height - event.endCoordinates.screenY;
          apply(Math.max(0, covered), event);
        },
      );

      return () => subscription.remove();
    }

    const subscriptions = [
      Keyboard.addListener("keyboardDidShow", (event) => {
        apply(event.endCoordinates.height + bottomInsetRef.current, event);
      }),
      Keyboard.addListener("keyboardDidHide", (event) => {
        apply(0, event);
      }),
    ];

    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, []);

  return overlap;
};

type Options = {
  /**
   * Height of the bar pinned over the bottom of the scroll area. The focused
   * input has to end up above it, not merely above the keyboard.
   */
  bottomInset: number;
};

type Rect = { x: number; y: number; width: number; height: number };

const measureInWindow = (node: HostInstance | View | ScrollView) =>
  new Promise<Rect>((resolve) => {
    (node as View).measureInWindow((x, y, width, height) => {
      resolve({ x, y, width, height });
    });
  });

/**
 * Guarantees that the focused text input ends up fully inside the *usable*
 * part of a scroll area — above the keyboard AND above the bar pinned over it.
 *
 * Why this is not left to the platform: iOS's UIKit does scroll a first
 * responder into view on its own, but it decides using the scroll view's frame
 * *at the moment the keyboard appears*, which is still the full-height one
 * because `KeyboardAvoidingView` shrinks it in the same transaction. A field
 * that was on screen before the keyboard came up is therefore considered
 * visible and never scrolled — which is how CreateProfile's Bio field ended up
 * entirely behind the keyboard. UIKit also knows nothing about the absolutely
 * positioned BottomAction bar, so even the fields it does scroll come to rest
 * with their bottom edge under it. Android has no equivalent behaviour at all.
 *
 * The mechanism deliberately reads no keyboard geometry. It measures the
 * scroll container's on-screen rect *after* keyboard avoidance has settled,
 * which on iOS is the `KeyboardAvoidingView`-shrunk frame and on Android
 * (edge-to-edge, `adjustResize`) is the resized window's frame. Both already
 * exclude the keyboard, and neither depends on gesture-nav insets, so one
 * implementation covers both platforms.
 */
export const useKeyboardAwareScroll = ({ bottomInset }: Options) => {
  const containerRef = React.useRef<View>(null);
  const scrollRef = React.useRef<ScrollView>(null);
  const offsetRef = React.useRef(0);
  const boxRef = React.useRef<HostInstance | null>(null);

  const scrollFocusedInputIntoView = React.useCallback(async () => {
    const container = containerRef.current;
    const scrollView = scrollRef.current;
    const input = TextInput.State.currentlyFocusedInput();

    if (!container || !scrollView || !input) return;

    const [containerRect, textRect, boxRect] = await Promise.all([
      measureInWindow(container),
      measureInWindow(input),
      boxRef.current ? measureInWindow(boxRef.current) : undefined,
    ]);

    // A screen that has been pushed away measures as an empty rect. Bail
    // rather than scrolling a scroll area the user cannot see.
    if (containerRect.height <= 0 || containerRect.width <= 0) return;
    if (textRect.height <= 0) return;

    // Use the padded box when it really is this field's box — the ref survives
    // a focus change to a plain TextInput, and a box that does not enclose the
    // text frame belongs to some other field.
    const enclosesText =
      boxRect !== undefined &&
      boxRect.y <= textRect.y &&
      boxRect.y + boxRect.height >= textRect.y + textRect.height;
    const inputRect = enclosesText ? boxRect : textRect;

    // The focused input belongs to some other screen's scroll area.
    const overlapsHorizontally =
      inputRect.x < containerRect.x + containerRect.width &&
      inputRect.x + inputRect.width > containerRect.x;
    if (!overlapsHorizontally) return;

    const usableBottom =
      containerRect.y + containerRect.height - bottomInset - FOCUS_CLEARANCE;
    const usableTop = containerRect.y + FOCUS_CLEARANCE;

    const overflowBelow = inputRect.y + inputRect.height - usableBottom;
    const overflowAbove = usableTop - inputRect.y;

    // Pull up first: a field taller than the usable area still has to show its
    // top, which is where the caret starts.
    const delta =
      overflowBelow > 0 ? overflowBelow : -Math.max(overflowAbove, 0);
    if (Math.abs(delta) < 1) return;

    scrollView.scrollTo({
      y: Math.max(0, offsetRef.current + delta),
      animated: true,
    });
  }, [bottomInset]);

  const requestScrollIntoView = React.useCallback<RequestScrollIntoView>(
    (box) => {
      if (box !== undefined) boxRef.current = box;
      void scrollFocusedInputIntoView();
      setTimeout(() => void scrollFocusedInputIntoView(), RETRY_DELAY_MS);
    },
    [scrollFocusedInputIntoView],
  );

  React.useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () =>
      requestScrollIntoView(),
    );

    return () => subscription.remove();
  }, [requestScrollIntoView]);

  const onScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetRef.current = event.nativeEvent.contentOffset.y;
    },
    [],
  );

  return {
    /** Spread onto the `View` wrapping the scroll area and its pinned bar. */
    containerProps: { ref: containerRef },
    /** Spread onto the `ScrollView`. */
    scrollProps: {
      ref: scrollRef,
      onScroll,
      scrollEventThrottle: 16,
    },
    requestScrollIntoView,
  };
};
