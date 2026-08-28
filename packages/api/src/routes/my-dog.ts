import { DogService } from "../services/dog-service";
import {
  assertDogImageOriginsAllowed,
  dogUpdateInputSchema,
} from "../shared/dog-input-schema";
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
    .input(dogUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const dog = await DogService.getDogByUserId(ctx.session.user.id);

      // Deferred out of the input schema because it needs the dog's own stored
      // URLs — see the comment on `dogUpdateInputSchema`.
      assertDogImageOriginsAllowed(
        input.images,
        await DogService.getImageUrls(dog.id),
      );

      const updatedDog = await DogService.updateDog(dog.id, input);
      return updatedDog;
    }),
});
