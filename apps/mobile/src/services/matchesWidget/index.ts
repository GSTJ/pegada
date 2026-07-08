import type { RouterOutputs } from "@pegada/api";

import {
  isWidgetModuleAvailable,
  setWidgetSnapshot,
  WidgetSnapshot,
} from "../../../modules/pegada-widget";
import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";
import { clearWidgetAvatars, downloadWidgetAvatars } from "./avatars";

type Matches = RouterOutputs["match"]["getAll"];
type Match = Matches[number];

const MAX_WIDGET_DOGS = 3;

/**
 * A match is waiting on the user when the other dog spoke last, or when the
 * match is brand new and nobody said hi yet.
 */
const isWaitingForReply = (match: Match) =>
  !match.lastMessage || match.lastMessage.senderId === match.dog.id;

// Snapshot writes reload the OS widget timelines, so skip no-op rewrites
// (Messages polls every 5s while focused).
let lastWrittenSnapshot: string | undefined;

const writeSnapshot = async (snapshot: WidgetSnapshot) => {
  const json = JSON.stringify(snapshot);
  if (json === lastWrittenSnapshot) return;

  await setWidgetSnapshot(snapshot);
  lastWrittenSnapshot = json;
};

/**
 * Rebuilds the home-screen widget snapshot from the given matches: downloads
 * up to 3 avatars into widget-readable storage and hands the localized
 * summary to the native side (App Group UserDefaults on iOS,
 * SharedPreferences on Android).
 */
export const syncMatchesWidget = async (matches: Matches): Promise<void> => {
  if (!isWidgetModuleAvailable()) return;

  try {
    const waiting = matches.filter(isWaitingForReply);
    const dogsOnWidget = waiting.slice(0, MAX_WIDGET_DOGS).map((match) => match.dog);

    const avatarPathByDogId = await downloadWidgetAvatars(
      dogsOnWidget.map((dog) => ({ dogId: dog.id, url: dog.images[0]?.url })),
    );

    await writeSnapshot({
      loggedIn: true,
      count: waiting.length,
      message:
        waiting.length > 0
          ? i18n.t("widget.waitingForReply", { count: waiting.length })
          : i18n.t("widget.allCaughtUp"),
      dogs: dogsOnWidget.map((dog) => ({
        name: dog.name,
        avatar: avatarPathByDogId.get(dog.id) ?? null,
      })),
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
    clearWidgetAvatars();

    await writeSnapshot({
      loggedIn: false,
      count: 0,
      message: i18n.t("widget.signedOut"),
      dogs: [],
    });
  } catch (error) {
    sendError(error);
  }
};
