import { z } from "zod";

import { DogService } from "../services/DogService";
import MessageService from "../services/MessageService";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const allByMatchSchema = z.object({
  matchId: z.string(),
  limit: z.coerce.number().optional().default(10),
  gt: z.coerce.date().optional(),
  lt: z.coerce.date().optional()
});

const sendSchema = z.object({
  matchId: z.string(),
  content: z.string()
});

const deleteSchema = z.object({
  messageId: z.string()
});

export const messageRouter = createTRPCRouter({
  allByMatch: protectedProcedure
    .input(allByMatchSchema)
    .query(async ({ ctx, input }) => {
      const { gt, lt, limit, matchId } = input;

      const dog = await DogService.getDogByUserId(ctx.session.user.id);

      const messages = await MessageService.getMessages({
        dogId: dog.id,
        matchId,
        gt,
        lt,
        limit
      });

      return messages;
    }),
  send: protectedProcedure
    .input(sendSchema)
    .mutation(async ({ ctx, input }) => {
      const { matchId, content } = input;

      const dog = await DogService.getDogByUserId(ctx.session.user.id);

      const messageService = new MessageService({ language: ctx.language });
      const newMessage = await messageService.sendMessage(
        content,
        dog.id,
        matchId
      );

      return newMessage;
    }),
  delete: protectedProcedure
    .input(deleteSchema)
    .mutation(async ({ ctx, input }) => {
      const { messageId } = input;

      const dog = await DogService.getDogByUserId(ctx.session.user.id);

      const deletedMessage = await MessageService.deleteMessage(
        dog.id,
        messageId
      );

      return deletedMessage;
    })
});
