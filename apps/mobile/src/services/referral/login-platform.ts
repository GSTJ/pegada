import { Platform } from "react-native";

/**
 * Sent with the login so the readout splits by store without a second event.
 * Anything that is not one of the two shipped platforms is left off rather
 * than guessed at, and the server defaults it to "unknown".
 */
export const LOGIN_PLATFORM =
  Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : undefined;
