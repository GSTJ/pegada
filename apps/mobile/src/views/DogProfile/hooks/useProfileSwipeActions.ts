import { useCallback } from "react";
import { useDispatch, useStore } from "react-redux";

import { sendError } from "@/services/errorTracking";
import { queueProfileSwipeIntent } from "@/store/profileSwipeIntent";
import { Actions, type RootReducer } from "@/store/reducers";
import { createSwipeOperationId } from "@/store/reducers/dogs/swipe";
import { getCurrentCardId } from "@/store/selectors";
import { Swipe } from "@/store/swipeTypes";
import type { ExitRequestResult } from "@/views/DogProfile/exitCoordinator";

type RequestProfileExit = (postHandoff?: () => void) => ExitRequestResult;

interface UseProfileSwipeActionsProps {
  dogId: string;
  profileSource?: string;
  requestExit: RequestProfileExit;
  swipeSessionId?: string;
}

export const useProfileSwipeActions = ({
  dogId,
  profileSource,
  requestExit,
  swipeSessionId,
}: UseProfileSwipeActionsProps) => {
  const dispatch = useDispatch();
  const store = useStore<RootReducer>();

  const requestReaction = useCallback(
    (swipeType: Swipe) => {
      const parsedSessionId = Number(swipeSessionId);
      const isSwipeProfile = profileSource === "swipe" && Number.isInteger(parsedSessionId);

      return requestExit(() => {
        if (!isSwipeProfile) {
          dispatch(
            Actions.dogs.swipe.request({
              deckMember: false,
              id: dogId,
              operationId: createSwipeOperationId(),
              swipeType,
            }),
          );
          return;
        }

        const state = store.getState();
        if (
          state.dogs.config.sessionId !== parsedSessionId ||
          getCurrentCardId(state) !== dogId ||
          !queueProfileSwipeIntent({ dogId, sessionId: parsedSessionId, swipeType })
        ) {
          sendError(new Error("Could not transfer DogProfile reaction to the source card"));
        }
      });
    },
    [dispatch, dogId, profileSource, requestExit, store, swipeSessionId],
  );

  return {
    handleMaybe: useCallback(() => requestReaction(Swipe.Maybe), [requestReaction]),
    handleNope: useCallback(() => requestReaction(Swipe.Dislike), [requestReaction]),
    handleYep: useCallback(() => requestReaction(Swipe.Like), [requestReaction]),
  };
};
