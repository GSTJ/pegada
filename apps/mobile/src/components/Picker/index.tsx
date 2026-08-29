import type { Item } from "./types";

import type { ListRenderItemInfo } from "react-native";

import { useImperativeHandle, useRef, useState } from "react";
import * as React from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native";

import { useTranslation } from "react-i18next";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { magicModal, useMagicModal } from "react-native-magic-modal";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import { Input } from "@/components/Input";
import { Text } from "@/components/text";

import { PickerSelectItem } from "./select-item";
import { CloseIcon, SearchInput, styles } from "./styles";

export type { Item };

export type InputPickerProps<T extends Item> = {
  title: string;
  placeholder?: string;
  value: T | undefined;
  error?: string;
  loading?: boolean;
  onChange: (value: T) => void;
  optional?: boolean;
  searchable?: boolean;
  data: T[];
  testID?: string;
  /**
   * When provided, each row in the picker sheet receives
   * `testID={itemTestIDPrefix + item.id}`. Used by Maestro flows to
   * reliably tap a known option (e.g. language/theme switches).
   */
  itemTestIDPrefix?: string;
};

export type PickerSheetRef = {
  present: () => void;
  close: () => void;
};

const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };

// A drag past this far, or a fast enough flick, dismisses the sheet.
// Otherwise it springs back under the finger.
const DISMISS_DISTANCE = 80;
const DISMISS_VELOCITY = 800;

const PickerSheetContent = <T extends Item>(props: InputPickerProps<T>) => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const { hide } = useMagicModal();
  const handleClose = () => hide();

  const {
    title,
    value,
    onChange,
    searchable,
    itemTestIDPrefix,
    placeholder: _placeholder,
    error: _error,
    loading: _loading,
    optional: _optional,
    testID: _testID,
    ...flatlistProps
  } = props;

  const [filter, setFilter] = useState("");

  const data = filter
    ? props.data.filter((item) =>
        item.name.toLowerCase().includes(filter.toLowerCase()),
      )
    : props.data;

  const translateY = useSharedValue(0);

  const handleDrag = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > DISMISS_DISTANCE ||
        event.velocityY > DISMISS_VELOCITY;

      if (shouldDismiss) {
        translateY.value = withTiming(screenHeight, {}, () =>
          runOnJS(handleClose)(),
        );
      } else {
        translateY.value = withSpring(0, { stiffness: 200, damping: 25 });
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const keyExtractor = (item: T) => `${title}${item.id}`;

  const renderItem = ({ item }: ListRenderItemInfo<T>) => (
    <PickerSelectItem
      item={item}
      value={value}
      onChange={onChange}
      onClose={handleClose}
      testID={
        itemTestIDPrefix ? `${itemTestIDPrefix}${item.id ?? "any"}` : undefined
      }
    />
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View
        style={[
          styles.sheet,
          { maxHeight: screenHeight * 0.9 },
          sheetAnimatedStyle,
        ]}
      >
        <GestureDetector gesture={handleDrag}>
          <View style={styles.handleContainer}>
            <View style={styles.handleBar} />
          </View>
        </GestureDetector>
        <View style={styles.titleContainer}>
          <Text fontSize="lg" fontWeight="medium">
            {title}
          </Text>
          {/* An icon-only Pressable announces nothing on its own; the label
              and role give VoiceOver something to read for the close control. */}
          <Pressable
            hitSlop={hitSlop}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel={t("pickerSheet.close")}
          >
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
        <FlatList
          style={styles.list}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingBottom: insets.bottom || theme.spacing[4],
          }}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          {...flatlistProps}
          data={data}
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const UnForwardedPickerSheet = <T extends Item>(
  props: InputPickerProps<T>,
  ref: React.ForwardedRef<PickerSheetRef>,
) => {
  const modalIDRef = useRef<string | undefined>(undefined);
  const propsRef = useRef(props);
  propsRef.current = props;

  useImperativeHandle(
    ref,
    () => ({
      present: () => {
        const { modalID } = magicModal.show(
          () => <PickerSheetContent {...propsRef.current} />,
          {
            // The library's own whole-content swipe would fight the list's
            // scroll and the search input's touches — dismissal is handled by
            // our own handle-scoped gesture inside PickerSheetContent instead.
            swipeDirection: undefined,
            style: { justifyContent: "flex-end" },
          },
        );
        modalIDRef.current = modalID;
      },
      close: () => {
        if (!modalIDRef.current) return;
        magicModal.hide(undefined, { modalID: modalIDRef.current });
      },
    }),
    [],
  );

  return null;
};

export const PickerSheet = React.forwardRef(UnForwardedPickerSheet) as <
  T extends Item,
>(
  props: InputPickerProps<T> & { ref?: React.Ref<PickerSheetRef> },
) => React.ReactElement;

export const InputPicker = <T extends Item>(props: InputPickerProps<T>) => {
  const pickerSheetRef = React.useRef<PickerSheetRef>(null);

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
      <PickerSheet {...props} ref={pickerSheetRef} />
    </View>
  );
};
