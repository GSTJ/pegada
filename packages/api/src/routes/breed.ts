import { createTRPCRouter, publicProcedure } from "../trpc";

export const breedRouter = createTRPCRouter({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.db.breed.findMany();
  })
});
