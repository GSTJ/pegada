import { authenticationRouter } from "./routes/authentication";
import { breedRouter } from "./routes/breed";
import { dogRouter } from "./routes/dog";
import { echoRouter } from "./routes/echo";
import { imageRouter } from "./routes/image";
import { matchRouter } from "./routes/match";
import { messageRouter } from "./routes/message";
import { myDogRouter } from "./routes/myDog";
import { swipeRouter } from "./routes/swipe";
import { userRouter } from "./routes/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  breed: breedRouter,
  user: userRouter,
  image: imageRouter,
  message: messageRouter,
  myDog: myDogRouter,
  swipe: swipeRouter,
  dog: dogRouter,
  authentication: authenticationRouter,
  match: matchRouter,
  echo: echoRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;
