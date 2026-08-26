import type { TextInput, TextInputProps, ViewProps } from "react-native";

import * as React from "react";
import { ActivityIndicator, View } from "react-native";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/text";

import * as S from "./styles";
import { styles } from "./styles";

type TextFieldContainerProps = {
  loading?: boolean;
  children: React.ReactNode;
};

const TextFieldContainer: React.FC<TextFieldContainerProps & ViewProps> = ({
  loading,
  children,
  ...props
}) => (
  <View style={styles.content} {...props}>
    {!loading && children}
    {loading ? (
      <ActivityIndicator style={styles.activityIndicatorComponent} />
    ) : null}
  </View>
);

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
        <TextFieldContainer loading={loading}>
          <S.TextInput
            style={styles.textInput}
            value={props.value}
            onChangeText={props.onChangeText}
            ref={ref}
            {...props}
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
