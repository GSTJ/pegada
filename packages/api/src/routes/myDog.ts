import { dogServerSchema } from "@pegada/shared/schemas/dogSchema";

import { DogService } from "../services/DogService";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const myDogRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const dog = await DogService.getYourOwnDogByUserId(ctx.session.user.id);
    return dog;
  }),

  delete: protectedProcedure.mutation(async ({ ctx }) => {
    await DogService.deleteDogsByUserId(ctx.session.user.id);
    return { ok: true };
  }),

  update: protectedProcedure
    .input(dogServerSchema.partial())
    .mutation(async ({ ctx, input }) => {
      const dog = await DogService.getDogByUserId(ctx.session.user.id);
      const updatedDog = await DogService.updateDog(dog.id, input);
      return updatedDog;
    })
});
