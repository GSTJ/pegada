import type { Item } from "./types";

import * as React from "react";

import { Text } from "@/components/text";

import { SelectItem, styles } from "./styles";

/**
 * One row of a picker sheet.
 *
 * Its own file so it can be tested without dragging in @gorhom/bottom-sheet
 * and the rest of the sheet's module graph.
 */
export const PickerSelectItem = <T extends Item>({
  item,
  value,
  onChange,
  onClose,
  testID,
}: {
  item: T;
  value: T | undefined;
  onChange: (value: T) => void;
  onClose: () => void;
  testID?: string;
}) => {
  const selected = value?.id === item.id;

  styles.useVariants({ selected });

  return (
    <SelectItem
      testID={testID}
      // The row is a Pressable wrapping a bare <Text>, and without
      // `accessible` neither of them is an accessibility element: the
      // Pressable has no label of its own and the Text is not exposed. On
      // iOS 26 Fabric that means the row is not in the tree at all —
      // VoiceOver skips it, and `tapOn: text: "Medium"` WARNs, which is why
      // every flow taps these rows by hard-coded point. Point taps are what
      // made the tour type into the wrong field twice.
      //
      // `accessible` collapses the row into one element; the label and role
      // give it something to announce, and `selected` is the state the
      // highlighted variant conveys visually and nothing conveyed otherwise.
      accessible
      accessibilityRole="button"
      accessibilityLabel={item.name}
      accessibilityState={{ selected }}
      onPress={() => {
        onChange?.(item);
        onClose();
      }}
      style={styles.selectItem}
    >
      <Text>{item.name}</Text>
    </SelectItem>
  );
};
