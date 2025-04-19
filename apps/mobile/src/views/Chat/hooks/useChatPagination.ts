import { useLocalSearchParams } from "expo-router";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";

import { getTrcpContext } from "@/contexts/trcpContext";
import { RouterOutputs } from "@/contexts/TRPCProvider";
import { FeedbackStatus } from "../components/Feedback";
import { useFetchNewMessages } from "./useFetchNewMessages";

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
      lt: pageParam
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
        return morePagesExist
          ? lastPage[lastPage.length - 1]?.createdAt
          : undefined;
      }
    });

  const loadMore = () => {
    if (!hasNextPage || isFetchingNextPage) return;

    void fetchNextPage();
  };

  useFetchNewMessages();

  const messages = data ? data.pages.flatMap((page) => page) : [];

  return {
    messages,
    loadMore,
    hasNextPage
  };
};
