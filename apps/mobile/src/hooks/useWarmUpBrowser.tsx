import { useFocusEffect } from "expo-router";
import { coolDownAsync, warmUpAsync } from "expo-web-browser";

import { sendError } from "@/services/errorTracking";

export const useWarmUpBrowser = () => {
  useFocusEffect(() => {
    warmUpAsync().catch(sendError);

    return () => {
      coolDownAsync().catch(sendError);
    };
  });
};
