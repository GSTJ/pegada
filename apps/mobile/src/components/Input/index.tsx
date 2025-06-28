import type { TextInput, TextInputProps, ViewProps } from "react-native";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import * as S from "./styles";

interface TextFieldContainerProps {
  loading?: boolean;
  children: React.ReactNode;
}

const TextFieldContainer: React.FC<TextFieldContainerProps & ViewProps> = ({
  loading,
  children,
  ...props
}) => (
  <S.Content {...props}>
    {!loading && children}
    {loading ? <S.ActivityIndicatorComponent /> : null}
  </S.Content>
);

interface InputProps extends TextInputProps {
  canCancel?: boolean;
  loading?: boolean;
  optional?: boolean;
  title?: string;
  error?: string;
}

export const Input = ({
  ref,
  title,
  canCancel = true,
  error,
  loading = false,
  optional = false,
  ...props
}: InputProps & {
  ref?: React.RefObject<TextInput>;
}) => {
  const { t } = useTranslation();

  return (
    <S.Container>
      {Boolean(title || optional) && (
        <S.TitleContainer>
          <Text fontWeight="bold" fontSize="lg">
            {title}
          </Text>
          {optional ? <Text fontSize="xs">{t("common.optional")}</Text> : null}
        </S.TitleContainer>
      )}
      <TextFieldContainer loading={loading}>
        <S.TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          ref={ref}
          {...props}
        />
        {Boolean(props.value) && canCancel ? (
          <S.CancelTouchArea onPress={() => props.onChangeText?.("")}>
            <S.CancelIcon />
          </S.CancelTouchArea>
        ) : null}
      </TextFieldContainer>
      {Boolean(error) && (
        <Text color="destructive" fontSize="xs">
          *{error}
        </Text>
      )}
    </S.Container>
  );
};
