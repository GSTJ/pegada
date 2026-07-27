import { useState } from "react";
import * as React from "react";

import { Container, Content, ErrorText, TextInput } from "./styles";

// oxlint-disable-next-line typescript/consistent-type-definitions -- the styled `TextInput`'s props carry a string index signature, which an intersection would widen `error` to `any` through. `extends` keeps it a string.
interface EmailInputProps extends React.ComponentProps<typeof TextInput> {
  error?: string;
}

const EmailInput: React.FC<EmailInputProps> = (props) => {
  const [email, setEmailNumber] = useState("");

  return (
    <Container>
      <Content>
        <TextInput
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmailNumber}
          autoFocus
          testID="signin-email"
          {...props}
        />
      </Content>
      {props.error ? (
        <ErrorText color="destructive" fontSize="xs">
          *{props.error}
        </ErrorText>
      ) : null}
    </Container>
  );
};

export default EmailInput;
