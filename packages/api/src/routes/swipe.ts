import { z } from "zod";

import { DogService } from "../services/DogService";
import { SuggestionService } from "../services/SuggestionService/SuggestionService";
import { SwipeService } from "../services/SwipeService";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const DEFAULT_LIMIT = 10;

const querySchema = z.object({
  limit: z.coerce.number().optional().default(DEFAULT_LIMIT),
  notIn: z.array(z.string()).optional()
});

const swipeSchema = z.object({
  id: z.string(),
  swipeType: z.enum(["NOT_INTERESTED", "MAYBE", "INTERESTED"])
});

export const swipeRouter = createTRPCRouter({
  all: protectedProcedure.input(querySchema).query(async ({ ctx, input }) => {
    const dog = await DogService.getDogByUserId(ctx.session.user.id);

    if (!dog) {
      throw new Error("Dog not found");
    }

    const potentialMatches = await SuggestionService.getPotentialMatches(
      dog,
      input.limit,
      input.notIn ?? []
    );

    return potentialMatches;
  }),
  swipe: protectedProcedure
    .input(swipeSchema)
    .mutation(async ({ ctx, input }) => {
      const dog = await DogService.getFullDogByUserId(ctx.session.user.id);

      if (!dog) {
        throw new Error("Dog not found");
      }

      const swipeService = new SwipeService({ language: ctx.language });
      const swipe = await swipeService.swipeDog({
        requester: dog,
        responderId: input.id,
        swipeType: input.swipeType,
        userId: ctx.session.user.id
      });

      return swipe;
    })
});
