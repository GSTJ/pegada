import * as React from "react";

import Clock from "../assets/clock.svg";
import Error from "../assets/error.svg";
import Tick from "../assets/tick.svg";

export enum FeedbackStatus {
  Error = "error",
  Loading = "loading",
  Success = "success"
}

interface FeedbackProps extends React.ComponentProps<typeof Tick> {
  status?: FeedbackStatus;
}

const Feedback: React.FC<FeedbackProps> = ({ status, ...rest }) => {
  if (status === FeedbackStatus.Loading) return <Clock {...rest} />;
  if (status === FeedbackStatus.Error) return <Error {...rest} />;
  return <Tick {...rest} />;
};

export default Feedback;
