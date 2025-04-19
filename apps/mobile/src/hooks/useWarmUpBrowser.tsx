import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { sendError } from "@/services/errorTracking";

export const useWarmUpBrowser = () => {
  useFocusEffect(() => {
    WebBrowser.warmUpAsync().catch(sendError);

    return () => {
      WebBrowser.coolDownAsync().catch(sendError);
    };
  });
};
