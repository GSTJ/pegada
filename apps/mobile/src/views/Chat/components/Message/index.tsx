import * as React from "react";
import {
  SlideInLeft,
  SlideInRight,
  SlideOutRight
} from "react-native-reanimated";
import { format } from "date-fns";

import { Text } from "@/components/Text";
import Feedback, { FeedbackStatus } from "../Feedback";
import { Info, Message, Time } from "./styles";

interface MessageComponentProps {
  children: string;
  self: boolean;
  createdAt: Date;
  status?: FeedbackStatus;
  id: string;
  newMessage?: boolean;
}

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
