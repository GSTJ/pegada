import type { BottomSheetFlatListProps } from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/types";

import type { ListRenderItemInfo } from "react-native";

import { useState } from "react";
import * as React from "react";
import { Pressable, useWindowDimensions, View } from "react-native";

import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import { renderCustomBackdrop } from "@/components/custom-backdrop";
import { Input } from "@/components/Input";
import { Text } from "@/components/text";

import { CloseIcon, SearchInput, SelectItem, styles } from "./styles";

export type Item = {
  id: string | null;
  name: string;
};

export type InputPickerProps<T extends Item> = {
  title: string;
  placeholder?: string;
  value: T | undefined;
  error?: string;
  loading?: boolean;
  onChange: (value: T) => void;
  optional?: boolean;
  searchable?: boolean;
  snapPoints?: string[];
  data: T[];
  testID?: string;
  /**
   * When provided, each row in the picker sheet receives
   * `testID={itemTestIDPrefix + item.id}`. Used by Maestro flows to
   * reliably tap a known option (e.g. language/theme switches).
   */
  itemTestIDPrefix?: string;
} & Partial<Omit<BottomSheetFlatListProps<T>, "ref">>;

const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

const PickerSelectItem = <T extends Item>({
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
  styles.useVariants({ selected: value?.id === item.id });
  return (
    <SelectItem
      testID={testID}
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

const UnForwardedPickerSheet = <T extends Item>(
  props: InputPickerProps<T>,
  ref: React.ForwardedRef<BottomSheetModal>,
) => {
  const { t } = useTranslation();

  const { theme } = useUnistyles();

  const insets = useSafeAreaInsets();

  const pickerSheetRef = ref as React.MutableRefObject<BottomSheetModal>;

  const onClose = () => {
    pickerSheetRef.current.close();
  };

  const [filter, setFilter] = useState("");

  const {
    title,
    placeholder: _placeholder,
    value,
    error: _error,
    loading: _loading,
    onChange,
    optional: _optional,
    searchable,
    snapPoints,
    itemTestIDPrefix,
    testID: _testID,
    ...flatlistProps
  } = props;

  // When no snapPoints are given, let the sheet size to its content (v5
  // dynamic sizing) so short lists like language/theme aren't clipped by a
  // fixed fraction of the screen. Searchable/long lists still pass explicit
  // snapPoints for a tall scrollable sheet. Cap dynamic height so a big list
  // can't grow past the screen.
  const enableDynamicSizing = !snapPoints;
  const { height: screenHeight } = useWindowDimensions();

  const data = filter
    ? props.data.filter((item) =>
        item.name.toLowerCase().includes(filter.toLowerCase()),
      )
    : props.data;

  const backgroundStyle = {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm,
  };
  const handleIndicatorStyle = {
    backgroundColor: theme.colors.text,
  };
  const handleStyle = {
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
  };
  const contentContainerStyle = {
    paddingBottom: insets.bottom,
  };

  const keyExtractor = (item: T) => `${title}${item.id}`;

  const renderItem = ({ item }: ListRenderItemInfo<T>) => (
    <PickerSelectItem
      item={item}
      value={value}
      onChange={onChange}
      onClose={onClose}
      testID={
        itemTestIDPrefix ? `${itemTestIDPrefix}${item.id ?? "any"}` : undefined
      }
    />
  );

  return (
    <BottomSheetModal
      android_keyboardInputMode="adjustResize" // Fixes the keyboard extra padding on Android
      ref={pickerSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      maxDynamicContentSize={screenHeight * 0.9}
      enableDismissOnClose
      keyboardBehavior="interactive"
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      handleStyle={handleStyle}
      backdropComponent={renderCustomBackdrop}
    >
      <View style={styles.titleContainer}>
        <Text fontSize="lg" fontWeight="medium">
          {title}
        </Text>
        <Pressable hitSlop={hitSlop} onPress={onClose}>
          <CloseIcon style={styles.closeIcon} />
        </Pressable>
      </View>
      {searchable ? (
        <View style={styles.searchContainer}>
          <SearchInput
            placeholder={t("pickerSheet.search")}
            value={filter}
            onChangeText={setFilter}
            style={styles.searchInput}
          />
        </View>
      ) : null}
      <BottomSheetFlatList
        keyExtractor={keyExtractor}
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
        {...flatlistProps}
        data={data}
      />
    </BottomSheetModal>
  );
};

export const PickerSheet = React.forwardRef(UnForwardedPickerSheet) as <
  T extends Item,
>(
  props: InputPickerProps<T> & { ref?: React.Ref<BottomSheetModal> },
) => React.ReactElement;

export const InputPicker = <T extends Item>(props: InputPickerProps<T>) => {
  const pickerSheetRef = React.useRef<BottomSheetModal>(null);

  return (
    <View style={styles.container}>
      <Pressable
        testID={props.testID}
        disabled={props.loading}
        onPress={() => pickerSheetRef.current?.present()}
        pointerEvents="box-only"
      >
        <Input
          loading={props.loading}
          title={props.title}
          placeholder={props.placeholder}
          value={props.value?.name}
          error={props.error}
          maxLength={50}
          canCancel={false}
          autoCorrect={false}
          optional={props.optional}
        />
      </Pressable>
      {/* Long/searchable lists (breeds, sizes, colors) keep a tall fixed sheet;
          direct PickerSheet users without snapPoints get content-fit sizing. */}
      <PickerSheet
        snapPoints={["70%", "93%"]}
        {...props}
        ref={pickerSheetRef}
      />
    </View>
  );
};
