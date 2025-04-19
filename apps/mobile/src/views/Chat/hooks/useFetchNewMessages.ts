import { useEffect, useRef } from "react";
import { useLocalSearchParams } from "expo-router";

import { getTrcpContext } from "@/contexts/trcpContext";
import { sendError } from "@/services/errorTracking";
import { queryClient } from "@/services/queryClient";
import { MessageProps } from "./useChatPagination";

const REFRESH_INTERVAL = 5000;
export const useFetchNewMessages = () => {
  const { matchId, dogId } = useLocalSearchParams();
  const latestPollTimestampRef = useRef(new Date());

  useEffect(() => {
    const fetchNewMessages = async () => {
      try {
        const newMessages = await getTrcpContext().message.allByMatch.fetch({
          matchId: matchId as string,
          gt: latestPollTimestampRef.current
        });

        if (!newMessages || !newMessages.length) return;

        latestPollTimestampRef.current = new Date();

        queryClient.setQueryData(
          ["messages", matchId],
          (oldData: { pages: MessageProps[][] } | undefined) => {
            const updatedPages = [...(oldData?.pages ?? [])];

            updatedPages[0] = [
              ...newMessages.map((message) => ({
                ...message,
                newMessage: true
              })),
              ...(updatedPages[0] ?? [])
            ]
              .filter(
                (message, index, self) =>
                  // Remove duplicates, for example our own messages
                  index === self.findIndex((m) => m.id === message.id)
              )
              .sort((a, b) => {
                // Sorting might not be necessary, but better safe than sorry
                if (a.createdAt < b.createdAt) return 1;
                if (a.createdAt > b.createdAt) return -1;
                return 0;
              });

            const lastMessage = updatedPages[0][0];

            // Update last message for this match
            getTrcpContext().match.getAll.setData(undefined, (matches) => {
              if (!matches) return undefined;
              const match = matches.find((match) => match.id === matchId);
              if (!match) return matches;
              return [
                ...matches.filter((match) => match.id !== matchId),
                {
                  ...match,
                  lastMessage: lastMessage
                }
              ];
            });

            return { ...oldData, pages: updatedPages };
          }
        );
      } catch (err) {
        // Deals with pooling errors silently
        sendError(err);
      }
    };

    const intervalId = setInterval(fetchNewMessages, REFRESH_INTERVAL);

    // Clean up on unmount
    return () => {
      clearInterval(intervalId);

      // Unmark all messages as new
      queryClient.setQueryData(
        ["messages", matchId],
        (oldData: { pages: MessageProps[][] } | undefined) => {
          const updatedPages = [...(oldData?.pages ?? [])].map((page) =>
            page.map((message) => ({ ...message, newMessage: false }))
          );

          return { ...oldData, pages: updatedPages };
        }
      );
    };
  }, [dogId, matchId]);
};
