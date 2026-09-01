import type { MessageProps } from "./use-chat-pagination";

import { useLocalSearchParams } from "expo-router";

import { v4 as uuidV4 } from "uuid";

import { getTrcpContext } from "@/contexts/trcp-context";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { queryClient } from "@/services/query-client";

import { FeedbackStatus } from "../components/feedback";

export const useSendMessage = () => {
  const { matchId } = useLocalSearchParams();

  const addTemp = (id: string, body: string) => {
    const tempMessage: MessageProps = {
      id,
      content: body,
      createdAt: new Date(),
      deletedAt: null,
      receiverId: "YOU_YOURSELF_AND_YOU",
      matchId: matchId as string,
      senderId: "ME_MYSELF_AND_I",
      status: FeedbackStatus.Loading,
      newMessage: true,
    };

    queryClient.setQueryData(
      ["messages", matchId],
      (oldData: { pages: MessageProps[][] } | undefined) => {
        let updatedPages = [...(oldData?.pages ?? [[]])];

        updatedPages = updatedPages.map((page) =>
          page.map((message) => ({ ...message, newMessage: false })),
        );

        updatedPages[0] = [tempMessage, ...(updatedPages[0] ?? [])];
        return { ...oldData, pages: updatedPages };
      },
    );
  };

  // should mark a message as error given the id
  const errorTemp = (id: string) => {
    queryClient.setQueryData(
      ["messages", matchId],
      (oldData: { pages: MessageProps[][] } | undefined) => {
        const updatedPages = [...(oldData?.pages ?? [[]])];
        updatedPages[0] =
          updatedPages[0]?.map((message) => {
            if (message.id === id) {
              return { ...message, status: FeedbackStatus.Error };
            }
            return message;
          }) ?? [];
        return { ...oldData, pages: updatedPages };
      },
    );
  };

  const removeTemp = (id: string) => {
    queryClient.setQueryData(
      ["messages", matchId],
      (oldData: { pages: MessageProps[][] } | undefined) => {
        const updatedPages = [...(oldData?.pages ?? [[]])];
        updatedPages[0] =
          updatedPages[0]?.filter((message) => message.id !== id) ?? [];
        return { ...oldData, pages: updatedPages };
      },
    );
  };

  const confirmMessage = (tempId: string, newMessage: MessageProps) => {
    queryClient.setQueryData(
      ["messages", matchId],
      (oldData: { pages: MessageProps[][] } | undefined) => {
        const updatedPages = [...(oldData?.pages ?? [[]])];
        updatedPages[0] =
          updatedPages[0]?.map((message) => {
            if (message.id === tempId) {
              return newMessage;
            }
            return message;
          }) ?? [];
        return { ...oldData, pages: updatedPages };
      },
    );

    // Update last message for this match
    getTrcpContext().match.getAll.setData(undefined, (matches) => {
      if (!matches) return undefined;
      const match = matches.find((match) => match.id === matchId);
      if (!match) return matches;
      return [
        ...matches.filter((match) => match.id !== matchId),
        {
          ...match,
          lastMessage: newMessage,
        },
      ];
    });
  };

  const sendMessage = async (content: string) => {
    const tempId = uuidV4();

    try {
      // Add a fake 'sending' message to give an optimistic UI
      addTemp(tempId, content);

      const newMessage = await getTrcpContext().client.message.send.mutate({
        matchId: matchId as string,
        content,
      });

      confirmMessage(tempId, {
        ...newMessage,
        newMessage: true,
      });

      // After the mutation resolves, so an optimistic bubble that never lands
      // is not counted as a message. The server captures its own copy.
      analytics.track({
        event_type: "Message Sent",
        event_properties: {
          has_text: content.trim().length > 0,
          match_id: String(matchId),
        },
      });
    } catch (error) {
      sendError(error);

      errorTemp(tempId);
      setTimeout(() => removeTemp(tempId), 1500);
    }
  };

  return sendMessage;
};
