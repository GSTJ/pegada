import type { RouterOutputs } from "@pegada/api";

import {
  isWidgetModuleAvailable,
  setWidgetSnapshot,
  WidgetSnapshot,
  WidgetSnapshotDog,
  WidgetSnapshotState,
} from "../../../modules/pegada-widget";
import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";
import { clearWidgetAvatars, downloadWidgetAvatars } from "./avatars";
import { widgetSyncCoordinator, WidgetSyncLease } from "./syncCoordinator";

type Matches = RouterOutputs["match"]["getAll"];
type Match = Matches[number];

const MAX_WIDGET_DOGS = 3;

export const invalidateMatchesWidgetSignedInWork = () => {
  widgetSyncCoordinator.beginSignedOutSession();
};

/**
 * A match needs attention when the other dog spoke last, or when the match
 * is brand new and nobody said hi yet.
 */
const needsAttention = (match: Match) =>
  !match.lastMessage || match.lastMessage.senderId === match.dog.id;

/**
 * Replies are more time-sensitive than introductions, so newest inbound
 * messages lead. Matches without a message keep their API order after every
 * real reply, which makes the hero deterministic across syncs.
 */
const getMatchesToCheck = (matches: Matches): Matches =>
  matches
    .map((match, index) => ({ index, match }))
    .filter(({ match }) => needsAttention(match))
    // The map above creates a private array; sorting it cannot mutate query data.
    // oxlint-disable-next-line unicorn/no-array-sort
    .sort((a, b) => {
      const aMessage = a.match.lastMessage;
      const bMessage = b.match.lastMessage;

      if (aMessage && !bMessage) return -1;
      if (!aMessage && bMessage) return 1;

      if (aMessage && bMessage) {
        if (aMessage.createdAt < bMessage.createdAt) return 1;
        if (aMessage.createdAt > bMessage.createdAt) return -1;
      }

      return a.index - b.index;
    })
    .map(({ match }) => match);

/**
 * When nothing needs attention, recent matched dogs keep the caught-up state
 * personal instead of falling back to a generic empty illustration.
 */
const getRecentMatches = (matches: Matches): Matches =>
  matches
    .map((match, index) => ({ index, match }))
    // The map above creates a private array; sorting it cannot mutate query data.
    // oxlint-disable-next-line unicorn/no-array-sort
    .sort((a, b) => {
      const aMessage = a.match.lastMessage;
      const bMessage = b.match.lastMessage;

      if (aMessage && !bMessage) return -1;
      if (!aMessage && bMessage) return 1;

      if (aMessage && bMessage) {
        if (aMessage.createdAt < bMessage.createdAt) return 1;
        if (aMessage.createdAt > bMessage.createdAt) return -1;
      }

      return a.index - b.index;
    })
    .map(({ match }) => match);

// Snapshot writes reload the OS widget timelines, so skip no-op rewrites
// (Messages polls every 5s while focused).
let lastWrittenSnapshot: string | undefined;

const writeSnapshot = async (snapshot: WidgetSnapshot, lease: WidgetSyncLease) => {
  if (!lease.isLatest()) return;

  const json = JSON.stringify(snapshot);
  if (json === lastWrittenSnapshot) return;

  // This is the final cancellable boundary. Native persistence itself cannot
  // be revoked after invocation, and the serialized queue prevents another
  // generation from publishing concurrently.
  if (!lease.isLatest()) return;
  await setWidgetSnapshot(snapshot);

  if (lease.isLatest()) {
    lastWrittenSnapshot = json;
  }
};

const getDogPrompt = (match: Match) =>
  match.lastMessage
    ? i18n.t("widget.replyTo", { name: match.dog.name })
    : i18n.t("widget.sayHiTo", { name: match.dog.name });

const getStateCopy = (
  state: WidgetSnapshotState,
  matchesToCheck: Matches,
): { primary: string; secondary: string; message: string } => {
  if (state === "attention") {
    const secondary = i18n.t("widget.matchesReadyToChat", { count: matchesToCheck.length });
    return {
      primary: matchesToCheck[0] ? getDogPrompt(matchesToCheck[0]) : secondary,
      secondary,
      message: secondary,
    };
  }

  if (state === "caughtUp") {
    const primary = i18n.t("widget.caughtUp");
    const secondary = i18n.t("widget.findMoreDogs");
    return { primary, secondary, message: `${primary}. ${secondary}` };
  }

  if (state === "noMatches") {
    const primary = i18n.t("widget.findDogs");
    const secondary = i18n.t("widget.noMatchesYet");
    return { primary, secondary, message: `${secondary}. ${primary}` };
  }

  const primary = i18n.t("widget.signIn");
  const secondary = i18n.t("widget.seeYourMatches");
  return { primary, secondary, message: `${primary}. ${secondary}` };
};

const toSnapshotDogs = (
  matches: Matches,
  avatarPathByDogId: Map<string, string>,
  includePrompts: boolean,
): WidgetSnapshotDog[] =>
  matches.map((match) => ({
    matchId: match.id,
    dogId: match.dog.id,
    name: match.dog.name,
    avatar: avatarPathByDogId.get(match.dog.id) ?? null,
    prompt: includePrompts ? getDogPrompt(match) : null,
  }));

/**
 * Rebuilds the home-screen widget snapshot from the given matches: downloads
 * up to 3 avatars into widget-readable storage and hands the localized
 * summary to the native side (App Group UserDefaults on iOS,
 * SharedPreferences on Android).
 */
export const syncMatchesWidget = async (matches: Matches): Promise<void> => {
  if (!isWidgetModuleAvailable()) return;

  try {
    await widgetSyncCoordinator.enqueueSignedIn(async (lease) => {
      const matchesToCheck = getMatchesToCheck(matches);
      const state: WidgetSnapshotState =
        matchesToCheck.length > 0 ? "attention" : matches.length > 0 ? "caughtUp" : "noMatches";
      const matchesOnWidget =
        state === "attention"
          ? matchesToCheck.slice(0, MAX_WIDGET_DOGS)
          : getRecentMatches(matches).slice(0, MAX_WIDGET_DOGS);

      const avatarPathByDogId = await downloadWidgetAvatars(
        matchesOnWidget.map(({ dog }) => ({ dogId: dog.id, url: dog.images[0]?.url })),
        lease.isLatest,
      );

      if (!lease.isLatest()) return;

      const copy = getStateCopy(state, matchesToCheck);
      await writeSnapshot(
        {
          state,
          loggedIn: true,
          count: matchesToCheck.length,
          ...copy,
          dogs: toSnapshotDogs(matchesOnWidget, avatarPathByDogId, state === "attention"),
        },
        lease,
      );
    });
  } catch (error) {
    // The widget is a companion surface; never let it break the app flow.
    sendError(error);
  }
};

/**
 * Called on logout: wipes the cached avatars and leaves a friendly
 * localized sign-in prompt on the widget.
 */
export const syncMatchesWidgetLoggedOut = async (): Promise<void> => {
  if (!isWidgetModuleAvailable()) return;

  try {
    // enqueueSignedOut() also closes the barrier for any direct caller that
    // did not invalidate it at the start of the app's logout flow.
    await widgetSyncCoordinator.enqueueSignedOut(async (lease) => {
      try {
        clearWidgetAvatars();
      } catch (error) {
        // Publishing the signed-out state is the privacy-critical operation.
        // Report a failed best-effort disk cleanup without leaving match data
        // visible on the Home Screen.
        sendError(error);
      }

      if (!lease.isLatest()) return;

      await writeSnapshot(
        {
          state: "signedOut",
          loggedIn: false,
          count: 0,
          ...getStateCopy("signedOut", []),
          dogs: [],
        },
        lease,
      );
    });
  } catch (error) {
    sendError(error);
  }
};
