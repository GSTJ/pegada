import type { TextProps } from "@/components/text";

import type { ViewProps } from "react-native";

import { View } from "react-native";

import { StyleSheet } from "react-native-unistyles";

import { Text } from "@/components/text";

/**
 * These stay components rather than becoming bare style objects: the profile
 * header (`views/(tabs)/Profile/components/UserDogProfileHeader`) renders all
 * four from the outside, and the typography props that used to be `.attrs`
 * defaults belong with the element, not with every call site.
 */
export const Container = ({ style, ...props }: ViewProps) => (
  <View {...props} style={[styles.container, style]} />
);

export const Name = ({ style, ...props }: TextProps) => (
  <Text
    {...props}
    fontWeight="black"
    fontSize="xl"
    style={[styles.name, style]}
  />
);

/** `styled(Name)`: same rules, one attr overridden and its own font size. */
export const Age = ({ style, ...props }: TextProps) => (
  <Text
    {...props}
    fontWeight="medium"
    fontSize="xl"
    style={[styles.age, style]}
  />
);

export const Description = ({ style, ...props }: TextProps) => (
  <Text {...props} style={[styles.description, style]} />
);

const NAME_COLOR = "#fff";

const styles = StyleSheet.create((theme) => ({
  container: {
    paddingTop: theme.spacing[12],
    paddingRight: theme.spacing[6],
    paddingBottom: theme.spacing[28],
    paddingLeft: theme.spacing[6],
  },
  name: {
    color: NAME_COLOR,
    marginBottom: theme.spacing[1],
  },
  age: {
    color: NAME_COLOR,
    marginBottom: theme.spacing[1],
    fontSize: 18,
  },
  description: {
    color: NAME_COLOR,
  },
}));
