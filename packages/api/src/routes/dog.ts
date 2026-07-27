import { z } from "zod";

import { DogService } from "../services/dog-service";
import { dogInputSchema } from "../shared/dog-input-schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const getDogSchema = z.object({
  id: z.string(),
});

export const dogRouter = createTRPCRouter({
  get: protectedProcedure.input(getDogSchema).query(async ({ ctx, input }) => {
    const dog = await DogService.getDogById(input.id, ctx.session.user.id);
    return dog;
  }),

  create: protectedProcedure.input(dogInputSchema).mutation(async ({ ctx, input }) => {
    const dog = await DogService.createDog({
      ...input,
      userId: ctx.session.user.id,
    });

    return dog;
  }),
});
