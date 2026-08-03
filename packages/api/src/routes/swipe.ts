import { DogService } from "../services/dog-service";
import { SuggestionService } from "../services/SuggestionService/suggestion-service";
import { SwipeService } from "../services/swipe-service";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { swipeInputSchema, swipeQueryInputSchema } from "./input-schemas";

export const swipeRouter = createTRPCRouter({
  all: protectedProcedure
    .input(swipeQueryInputSchema)
    .query(async ({ ctx, input }) => {
      const dog = await DogService.getDogByUserId(ctx.session.user.id);

      if (!dog) {
        throw new Error("Dog not found");
      }

      const potentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        input.limit,
        input.notIn ?? [],
      );

      return potentialMatches;
    }),
  swipe: protectedProcedure
    .input(swipeInputSchema)
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
        userId: ctx.session.user.id,
      });

      return swipe;
    }),
});
