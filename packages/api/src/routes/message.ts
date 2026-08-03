import { DogService } from "../services/dog-service";
import MessageService from "../services/message-service";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import {
  messageDeleteInputSchema,
  messageListInputSchema,
  messageSendInputSchema,
} from "./input-schemas";

export const messageRouter = createTRPCRouter({
  allByMatch: protectedProcedure
    .input(messageListInputSchema)
    .query(async ({ ctx, input }) => {
      const { gt, lt, limit, matchId } = input;

      const dog = await DogService.getDogByUserId(ctx.session.user.id);

      const messages = await MessageService.getMessages({
        dogId: dog.id,
        matchId,
        gt,
        lt,
        limit,
      });

      return messages;
    }),
  send: protectedProcedure
    .input(messageSendInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { matchId, content } = input;

      const dog = await DogService.getDogByUserId(ctx.session.user.id);

      const messageService = new MessageService({ language: ctx.language });
      const newMessage = await messageService.sendMessage(
        content,
        dog.id,
        matchId,
      );

      return newMessage;
    }),
  delete: protectedProcedure
    .input(messageDeleteInputSchema)
    .mutation(async ({ ctx, input }) => {
      const { messageId } = input;

      const dog = await DogService.getDogByUserId(ctx.session.user.id);

      const deletedMessage = await MessageService.deleteMessage({
        messageId,
        senderId: dog.id,
      });

      return deletedMessage;
    }),
});
