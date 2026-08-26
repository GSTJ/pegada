import * as React from "react";
import { View } from "react-native";

import { format } from "date-fns";
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutRight,
} from "react-native-reanimated";

import { Text } from "@/components/text";

import Feedback, { FeedbackStatus } from "../feedback";
import { styles, Time } from "./styles";

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

  styles.useVariants({ sending: self, status });

  return (
    <Animated.View
      accessible
      style={styles.message}
      testID={self ? "chat-message-self" : "chat-message-other"}
      key={id + status}
      entering={enteringAnimation}
      exiting={exitingAnimation}
    >
      <Text selectable>{children}</Text>
      <View style={styles.info}>
        <Time style={styles.time} fontSize="xxs">
          {format(createdAt, "HH:mm")}
        </Time>
        {self ? <Feedback status={status} /> : null}
      </View>
    </Animated.View>
  );
};

export default MessageComponent;
