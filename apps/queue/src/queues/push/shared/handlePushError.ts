import { sendError } from "@pegada/api/errors/errors";
import { UserService } from "@pegada/api/services/UserService";

export const handlePushError = async (
  errorMessage: string,
  pushToken: string
) => {
  const newError = new Error(
    `There was an error sending a notification: ${errorMessage}. Push Token: ${pushToken}.`
  );

  if (errorMessage === "DeviceNotRegistered") {
    try {
      await UserService.blacklistPushToken(pushToken);
    } catch (err) {
      sendError(err);
    }
  }

  sendError(newError);
};
