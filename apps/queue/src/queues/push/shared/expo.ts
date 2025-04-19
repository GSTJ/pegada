import { Expo } from "expo-server-sdk";

import { config } from "../../../shared/config";

export const expo = new Expo({
  accessToken: config.EXPO_ACCESS_TOKEN,
  maxConcurrentRequests: 100
});
