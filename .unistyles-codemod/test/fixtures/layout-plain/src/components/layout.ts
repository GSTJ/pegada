import { KeyboardAvoidingView } from "react-native";

import styled from "styled-components/native";

/**
 * The layout primitives that were being written as inline style objects in
 * every form screen. `react-native/no-inline-styles` is on, and repeating
 * `styled.View\`flex: 1\`` in six `styles.ts` files is worse than naming them
 * once.
 */

/** Takes all the space its parent gives it. */
export const Fill = styled.View`
  flex: 1;
`;

/** Lays its children out left to right. */
export const Row = styled.View`
  flex-direction: row;
`;

/** A screen root that grows to the space left over by the keyboard. */
export const KeyboardScreen = styled(KeyboardAvoidingView)`
  flex-grow: 1;
`;
