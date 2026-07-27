import type { FeedbackStatus } from "../components/feedback";
import type { RouterOutputs } from "@/contexts/trpc-provider";

import { useLocalSearchParams } from "expo-router";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";

import { getTrcpContext } from "@/contexts/trcp-context";

import { useFetchNewMessages } from "./use-fetch-new-messages";

const PAGE_SIZE = 20;

type Message = RouterOutputs["message"]["allByMatch"][number];

export interface MessageProps extends Message {
  status?: FeedbackStatus;
  newMessage?: boolean;
}

export const useChatPagination = () => {
  const { matchId } = useLocalSearchParams();

  const fetchMessages = async ({ pageParam }: { pageParam?: Date }) => {
    const response = await getTrcpContext().message.allByMatch.fetch({
      matchId: matchId as string,
      limit: PAGE_SIZE,
      lt: pageParam,
    });

    return response;
  };

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: ["messages", matchId],
      queryFn: fetchMessages,
      initialPageParam: undefined,
      getNextPageParam: (lastPage) => {
        const morePagesExist = lastPage.length === PAGE_SIZE;
        return morePagesExist ? lastPage.at(-1)?.createdAt : undefined;
      },
    });

  const loadMore = () => {
    if (!hasNextPage || isFetchingNextPage) return;

    void fetchNextPage();
  };

  useFetchNewMessages();

  // API returns messages newest-first (createdAt DESC) for cursor pagination.
  // FlashList v2 dropped the `inverted` prop, so the list renders top-down.
  // Reverse so the oldest message renders at the top and the newest renders
  // at the bottom — adjacent to the Send composer, matching chat UX.
  const messages = data ? data.pages.flat().reverse() : [];

  return {
    messages,
    loadMore,
    hasNextPage,
  };
};
