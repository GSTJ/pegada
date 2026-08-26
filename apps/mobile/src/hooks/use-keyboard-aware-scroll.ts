import type {
  HostInstance,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
} from "react-native";

import * as React from "react";
import { Keyboard, TextInput } from "react-native";

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
