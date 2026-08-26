import { View } from "react-native";

import { useUnistyles } from "react-native-unistyles";

import Check from "@/assets/images/Check.svg";

import { styles } from "./styles";

export const Checkbox = ({ selected }: { selected?: boolean }) => {
  const { theme } = useUnistyles();
  styles.useVariants({ selected });
  return (
    <View style={styles.container}>
      {selected ? <Check color={theme.colors.primary} /> : null}
    </View>
  );
};
