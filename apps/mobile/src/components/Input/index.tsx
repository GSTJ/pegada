import type { TextInput, TextInputProps, ViewProps } from "react-native";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import {
  ActivityIndicatorComponent,
  CancelIcon,
  CancelTouchArea,
  Container,
  Content,
  TextInput as StyledTextInput,
  TitleContainer
} from "./styles";

interface TextFieldContainerProps {
  loading?: boolean;
  children: React.ReactNode;
}

const TextFieldContainer: React.FC<TextFieldContainerProps & ViewProps> = ({
  loading,
  children,
  ...props
}) => (
  <Content {...props}>
    {!loading && children}
    {loading ? <ActivityIndicatorComponent /> : null}
  </Content>
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
    <Container>
      {Boolean(title ?? optional) && (
        <TitleContainer>
          <Text fontWeight="bold" fontSize="lg">
            {title}
          </Text>
          {optional ? <Text fontSize="xs">{t("common.optional")}</Text> : null}
        </TitleContainer>
      )}
      <TextFieldContainer loading={loading}>
        <StyledTextInput
          value={props.value}
          onChangeText={props.onChangeText}
          ref={ref}
          {...props}
        />
        {Boolean(props.value) && canCancel ? (
          <CancelTouchArea onPress={() => props.onChangeText?.("")}>
            <CancelIcon />
          </CancelTouchArea>
        ) : null}
      </TextFieldContainer>
      {Boolean(error) && (
        <Text color="destructive" fontSize="xs">
          *{error}
        </Text>
      )}
    </Container>
  );
};
