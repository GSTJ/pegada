import * as React from "react";

import Clock from "../assets/clock.svg";
import Error from "../assets/error.svg";
import Tick from "../assets/tick.svg";

export enum FeedbackStatus {
  Error = "error",
  Loading = "loading",
  Success = "success",
}

// oxlint-disable-next-line typescript/consistent-type-definitions -- react-native-svg's SvgProps carry a string index signature, which an intersection would widen `status` to `any` through. `extends` keeps it a FeedbackStatus.
interface FeedbackProps extends React.ComponentProps<typeof Tick> {
  status?: FeedbackStatus;
}

const Feedback: React.FC<FeedbackProps> = ({ status, ...rest }) => {
  if (status === FeedbackStatus.Loading) return <Clock {...rest} />;
  if (status === FeedbackStatus.Error) return <Error {...rest} />;
  return <Tick {...rest} />;
};

export default Feedback;
