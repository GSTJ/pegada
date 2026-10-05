import type * as QuickActions from "expo-quick-actions";
import { router } from "expo-router";

import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";
import { createPendingQuickActionCoordinator } from "../coordinator";

export enum QuickActionId {
  FindDogs = "findDogs",
  Matches = "matches",
}

// Dynamic shortcuts can survive an app update until the new binary runs and
// replaces them. Keep handling the removed action during that migration so a
// cached shortcut still does what its label promised without advertising it.
const LEGACY_EDIT_PROFILE_ACTION_ID = "editProfile";

const pendingQuickAction = createPendingQuickActionCoordinator<QuickActions.Action>();

export const captureInitialQuickAction = (action?: QuickActions.Action | null) => {
  pendingQuickAction.captureInitial(action);
};

export const setPendingQuickAction = (action?: QuickActions.Action | null) => {
  pendingQuickAction.queue(action);
};

export const clearPendingQuickAction = () => {
  pendingQuickAction.clear();
};

const handleUnknownQuickAction = (id: string) => {
  sendError(new Error(`Unknown quick action: ${id}`));
};

export const customQuickActionHandler = (action?: QuickActions.Action | null) => {
  if (!action) return;

  if (action.id === QuickActionId.FindDogs) {
    return router.navigate(SceneName.Swipe);
  }

  if (action.id === QuickActionId.Matches) {
    return router.navigate(SceneName.Messages);
  }

  if (action.id === LEGACY_EDIT_PROFILE_ACTION_ID) {
    return router.navigate(SceneName.EditProfile);
  }

  handleUnknownQuickAction(action.id);
};

// Only called once the app has resolved to the fully authenticated,
// onboarded route (`SceneName.Swipe`) -- see `useQuickActions`. This is
// the same "navigate only from an authenticated mount point" guarantee
// `services/linking`'s `processLinks` gets from only being called inside
// the Swipe screen.
export const flushPendingQuickAction = () => {
  pendingQuickAction.consume(customQuickActionHandler);
};
