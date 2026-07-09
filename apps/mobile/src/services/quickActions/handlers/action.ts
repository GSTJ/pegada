import * as QuickActions from "expo-quick-actions";
import { router } from "expo-router";

import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";

export enum QuickActionId {
  Matches = "matches",
  EditProfile = "editProfile",
}

// Holds a quick action tapped before we know whether the user is
// authenticated and fully onboarded (mirrors `initialNotification` in
// `services/linking/handlers/initialNotification.ts`). Cleared once
// consumed so it doesn't replay on a later, unrelated auth resolution.
let pendingQuickAction: QuickActions.Action | undefined;

export const setPendingQuickAction = (action?: QuickActions.Action | null) => {
  pendingQuickAction = action ?? undefined;
};

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

// Only called once the app has resolved to the fully authenticated,
// onboarded route (`SceneName.Swipe`) -- see `useQuickActions`. This is
// the same "navigate only from an authenticated mount point" guarantee
// `services/linking`'s `processLinks` gets from only being called inside
// the Swipe screen.
export const flushPendingQuickAction = () => {
  const action = pendingQuickAction;
  pendingQuickAction = undefined;
  customQuickActionHandler(action);
};
