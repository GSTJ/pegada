import { DogService } from "../services/DogService";
import MatchService from "../services/MatchService";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const matchRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const dog = await DogService.getDogByUserId(ctx.session.user.id);
    const matches = await MatchService.getMatchesForDog(dog.id);
    return matches;
  })
});
