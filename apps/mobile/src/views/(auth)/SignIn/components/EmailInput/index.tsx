import { useState } from "react";
import * as React from "react";

import { Container, Content, ErrorText, TextInput } from "./styles";

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
