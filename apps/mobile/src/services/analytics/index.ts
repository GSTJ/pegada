import { ampli as amplitude } from "@/ampli";
import { sendError } from "@/services/errorTracking";

const track = (
  event: Parameters<typeof amplitude.track>[0],
  options?: Parameters<typeof amplitude.track>[1]
) => {
  amplitude.track(event, options).promise.catch(sendError);
};

const screenViewed = (
  properties: Parameters<typeof amplitude.screenViewed>[0],
  options?: Parameters<typeof amplitude.screenViewed>[1]
) => {
  amplitude.screenViewed(properties, options).promise.catch(sendError);
};

const identify = (
  userId: Parameters<typeof amplitude.identify>[0],
  options?: Parameters<typeof amplitude.identify>[1]
) => {
  amplitude.identify(userId, options).promise.catch(sendError);
};

export const analytics = {
  track,
  screenViewed,
  identify
};
