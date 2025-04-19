import Animated from "react-native-reanimated";
import Color from "color";
import styled, { css } from "styled-components/native";

import { Text } from "@/components/Text";
import { FeedbackStatus } from "../Feedback";

interface MessageProps {
  sending: boolean;
  status?: FeedbackStatus;
}

export const Message = styled(Animated.View)<MessageProps>`
  padding: ${(props) => props.theme.spacing[2.5]}px;
  padding-top: ${(props) => props.theme.spacing[1.5]}px;
  padding-bottom: ${(props) => props.theme.spacing[2.5]}px;
  align-items: flex-end;
  max-width: 60%;
  background-color: ${(props) => props.theme.colors.card};
  border-color: ${(props) => props.theme.colors.border};
  border-width: ${(props) => props.theme.stroke.sm}px;
  border-radius: ${(props) => props.theme.radii.md}px;

  elevation: 0.5;
  shadow-color: #000;
  shadow-offset: 0px 1px;
  shadow-opacity: 0.05;
  shadow-radius: 0px;

  flex-direction: row;

  flex-wrap: wrap;

  margin-bottom: ${(props) => props.theme.spacing[1]}px;

  gap: ${(props) => props.theme.spacing[1.5]}px;

  ${(props) =>
    props.sending
      ? css`
          margin-left: auto;
          border-bottom-right-radius: 0;
        `
      : css`
          margin-right: auto;
          border-bottom-left-radius: 0;
        `};

  ${(props) =>
    props.status === FeedbackStatus.Error &&
    css`
      border-color: #dd2e44;
    `};
`;

export const Info = styled.View`
  margin: 0 0 0 auto;
  padding-left: ${(props) => props.theme.spacing[1]}px;
  flex-direction: row;
  align-items: center;
  gap: ${(props) => props.theme.spacing[1]}px;
`;

export const Time = styled(Text).attrs({ fontSize: "xxs" })`
  color: ${(props) => Color(props.theme.colors.text).alpha(0.5).string()};
`;
