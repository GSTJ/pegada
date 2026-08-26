import type {
  TextInput,
  TextInputProps,
  View as ViewType,
  ViewProps,
} from "react-native";

import * as React from "react";
import { ActivityIndicator, View } from "react-native";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/text";
import { useRequestScrollIntoView } from "@/hooks/use-keyboard-aware-scroll";

import * as S from "./styles";
import { styles } from "./styles";

type TextFieldContainerProps = {
  loading?: boolean;
  children: React.ReactNode;
};

const TextFieldContainer = React.forwardRef<
  ViewType,
  TextFieldContainerProps & ViewProps
>(({ loading, children, ...props }, ref) => (
  <View {...props} ref={ref} style={[styles.content, props.style]}>
    {!loading && children}
    {loading ? (
      <ActivityIndicator style={styles.activityIndicatorComponent} />
    ) : null}
  </View>
));

type InputProps = {
  canCancel?: boolean;
  loading?: boolean;
  optional?: boolean;
  title?: string;
  error?: string;
} & TextInputProps;

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      title,
      canCancel = true,
      error,
      loading = false,
      optional = false,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();

    // Inside a keyboard-aware scroll area this asks to be scrolled clear of
    // the keyboard and of whatever is pinned over it. Everywhere else it is a
    // no-op, so the primitive is unchanged for callers outside one.
    const requestScrollIntoView = useRequestScrollIntoView();

    // The padded box, not the bare TextInput: React Native measures a
    // TextInput as its text frame, so scrolling to that alone would still
    // leave the box's bottom padding under the pinned bar.
    const boxRef = React.useRef<ViewType>(null);

    const handleFocus: TextInputProps["onFocus"] = (event) => {
      requestScrollIntoView(boxRef.current);
      props.onFocus?.(event);
    };

    return (
      <View style={styles.container}>
        {Boolean(title || optional) && (
          <View style={styles.titleContainer}>
            <Text fontWeight="bold" fontSize="lg">
              {title}
            </Text>
            {optional ? (
              <Text fontSize="xs">{t("common.optional")}</Text>
            ) : null}
          </View>
        )}
        <TextFieldContainer ref={boxRef} loading={loading}>
          <S.TextInput
            value={props.value}
            onChangeText={props.onChangeText}
            ref={ref}
            {...props}
            onFocus={handleFocus}
            style={[styles.textInput, props.style]}
          />
          {Boolean(props.value) && canCancel ? (
            <S.CancelTouchArea
              onPress={() => props.onChangeText?.("")}
              style={styles.cancelTouchArea}
              hitSlop={{
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
              }}
            >
              <S.CancelIcon style={styles.cancelIcon} />
            </S.CancelTouchArea>
          ) : null}
        </TextFieldContainer>
        {Boolean(error) && (
          <Text color="destructive" fontSize="xs">
            *{error}
          </Text>
        )}
      </View>
    );
  },
);
