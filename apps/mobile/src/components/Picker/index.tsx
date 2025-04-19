import { useState } from "react";
import * as React from "react";
import { ListRenderItemInfo, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import { BottomSheetFlatListProps } from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/types";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import { renderCustomBackdrop } from "@/components/CustomBackdrop";
import { Input } from "@/components/Input";
import { Text } from "@/components/Text";
import {
  CloseIcon,
  Container,
  SearchContainer,
  SearchInput,
  SelectItem,
  TitleContainer
} from "./styles";

export type Item = {
  id: string | null;
  name: string;
};

export interface InputPickerProps<T extends Item>
  extends Partial<Omit<BottomSheetFlatListProps<T>, "ref">> {
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
}

const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

const PickerSelectItem = <T extends Item>({
  item,
  value,
  onChange,
  onClose
}: {
  item: T;
  value: T | undefined;
  onChange: (value: T) => void;
  onClose: () => void;
}) => {
  return (
    <SelectItem
      selected={value?.id === item.id}
      onPress={() => {
        onChange?.(item);
        onClose();
      }}
    >
      <Text>{item.name}</Text>
    </SelectItem>
  );
};

const UnForwardedPickerSheet = <T extends Item>(
  props: InputPickerProps<T>,
  ref: React.ForwardedRef<BottomSheetModal>
) => {
  const { t } = useTranslation();

  const theme = useTheme();

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
    snapPoints = ["70%", "93%"],
    ...flatlistProps
  } = props;

  const data = filter
    ? props.data.filter((item) =>
        item.name.toLowerCase().includes(filter.toLowerCase())
      )
    : props.data;

  const backgroundStyle = {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: theme.stroke.sm
  };
  const handleIndicatorStyle = {
    backgroundColor: theme.colors.text
  };
  const handleStyle = {
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md
  };
  const contentContainerStyle = {
    paddingBottom: insets.bottom
  };

  const keyExtractor = (item: T) => `${title}${item.id}`;

  const renderItem = ({ item }: ListRenderItemInfo<T>) => (
    <PickerSelectItem
      item={item}
      value={value}
      onChange={onChange}
      onClose={onClose}
    />
  );

  return (
    <BottomSheetModal
      android_keyboardInputMode="adjustResize" // Fixes the keyboard extra padding on Android
      ref={pickerSheetRef}
      snapPoints={snapPoints}
      enableDismissOnClose
      keyboardBehavior="interactive"
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      handleStyle={handleStyle}
      backdropComponent={renderCustomBackdrop}
    >
      <TitleContainer>
        <Text fontSize="lg" fontWeight="medium">
          {title}
        </Text>
        <Pressable hitSlop={hitSlop} onPress={onClose}>
          <CloseIcon />
        </Pressable>
      </TitleContainer>
      {searchable ? (
        <SearchContainer>
          <SearchInput
            placeholder={t("pickerSheet.search")}
            value={filter}
            onChangeText={setFilter}
          />
        </SearchContainer>
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
  T extends Item
>(
  props: InputPickerProps<T> & { ref?: React.Ref<BottomSheetModal> }
) => React.ReactElement;

export const InputPicker = <T extends Item>(props: InputPickerProps<T>) => {
  const pickerSheetRef = React.useRef<BottomSheetModal>(null);

  return (
    <Container>
      <Pressable
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
      <PickerSheet {...props} ref={pickerSheetRef} />
    </Container>
  );
};
