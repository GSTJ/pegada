import type { Action } from "expo-quick-actions";

import { router } from "expo-router";

import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

export enum QuickActionId {
  Matches = "matches",
  EditProfile = "editProfile",
}

// A shortcut can arrive before authentication finishes. Consume it once.
let pendingQuickAction: Action | undefined;

export const setPendingQuickAction = (action?: Action | null) => {
  pendingQuickAction = action ?? undefined;
};

const handleUnknownQuickAction = (id: string) => {
  sendError(new Error(`Unknown quick action: ${id}`));
};

export const customQuickActionHandler = (action?: Action | null) => {
  if (!action) return;

  if (action.id === QuickActionId.Matches) {
    return router.push(SceneName.Messages);
  }

  if (action.id === QuickActionId.EditProfile) {
    return router.push(SceneName.EditProfile);
  }

  handleUnknownQuickAction(action.id);
};

export const flushPendingQuickAction = () => {
  const action = pendingQuickAction;
  pendingQuickAction = undefined;
  customQuickActionHandler(action);
};
