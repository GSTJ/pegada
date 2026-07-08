import * as QuickActions from "expo-quick-actions";
import { router } from "expo-router";

import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";

export enum QuickActionId {
  Matches = "matches",
  EditProfile = "editProfile",
}

const handleUnknownQuickAction = (id: string) => {
  sendError(new Error(`Unknown quick action: ${id}`));
};

export const customQuickActionHandler = (action?: QuickActions.Action | null) => {
  if (!action) return;

  if (action.id === QuickActionId.Matches) {
    return router.push(SceneName.Messages);
  }

  if (action.id === QuickActionId.EditProfile) {
    return router.push(SceneName.EditProfile);
  }

  handleUnknownQuickAction(action.id);
};
