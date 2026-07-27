import * as React from "react";

import { format } from "date-fns";
import {
  SlideInLeft,
  SlideInRight,
  SlideOutRight,
} from "react-native-reanimated";

import { Text } from "@/components/text";

import Feedback, { FeedbackStatus } from "../feedback";
import { Info, Message, Time } from "./styles";

type MessageComponentProps = {
  children: string;
  self: boolean;
  createdAt: Date;
  status?: FeedbackStatus;
  id: string;
  newMessage?: boolean;
};

export const MessageComponent: React.FC<MessageComponentProps> = (props) => {
  const { children, self, createdAt, status, newMessage, id } = props;

  const incomingAnimation = newMessage ? SlideInLeft : undefined;

  const outgoingAnimation =
    status === FeedbackStatus.Loading ? SlideInRight : undefined;

  const enteringAnimation = self ? outgoingAnimation : incomingAnimation;

  const shouldSlideOutExit = self && status === FeedbackStatus.Error;
  const exitingAnimation = shouldSlideOutExit ? SlideOutRight : undefined;

  return (
    <Message
      testID={self ? "chat-message-self" : "chat-message-other"}
      key={id + status}
      entering={enteringAnimation}
      exiting={exitingAnimation}
      sending={self}
      status={status}
    >
      <Text selectable>{children}</Text>
      <Info>
        <Time>{format(createdAt, "HH:mm")}</Time>
        {self ? <Feedback status={status} /> : null}
      </Info>
    </Message>
  );
};

export default MessageComponent;
