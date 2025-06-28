import { z } from "zod";

import { dogServerSchema } from "@pegada/shared/schemas/dogSchema";

import { DogService } from "../services/DogService";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const getDogSchema = z.object({
  id: z.string()
});

export const dogRouter = createTRPCRouter({
  get: protectedProcedure.input(getDogSchema).query(async ({ ctx, input }) => {
    const dog = await DogService.getDogById(input.id, ctx.session.user.id);
    return dog;
  }),

  create: protectedProcedure
    .input(dogServerSchema)
    .mutation(async ({ ctx, input }) => {
      const dog = await DogService.createDog({
        ...input,
        userId: ctx.session.user.id
      });

      return dog;
    })
});
