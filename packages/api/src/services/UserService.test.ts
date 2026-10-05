import prisma from "@pegada/database";

import { UserService } from "./UserService";

const PUSH_TOKEN = "ExponentPushToken[shared-device]";

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.match.deleteMany();
  await prisma.image.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
});

const createUser = (email: string) => prisma.user.create({ data: { email } });

describe("push-token ownership", () => {
  test("moves one installation token to the latest account", async () => {
    const first = await createUser("first@push-token.test");
    const second = await createUser("second@push-token.test");

    await UserService.claimPushToken(first.id, PUSH_TOKEN);
    await UserService.claimPushToken(second.id, PUSH_TOKEN);

    await expect(prisma.user.findUnique({ where: { id: first.id } })).resolves.toMatchObject({
      pushToken: null,
    });
    await expect(prisma.user.findUnique({ where: { id: second.id } })).resolves.toMatchObject({
      pushToken: PUSH_TOKEN,
    });
  });

  test("serializes concurrent claims for the same installation token", async () => {
    const first = await createUser("first@concurrent-push-token.test");
    const second = await createUser("second@concurrent-push-token.test");

    await Promise.all([
      UserService.claimPushToken(first.id, PUSH_TOKEN),
      UserService.claimPushToken(second.id, PUSH_TOKEN),
    ]);

    await expect(prisma.user.count({ where: { pushToken: PUSH_TOKEN } })).resolves.toBe(1);
  });

  test("an older device cannot clear a newer device token", async () => {
    const user = await createUser("compare-and-clear@push-token.test");
    const newerToken = "ExponentPushToken[newer-device]";

    await UserService.claimPushToken(user.id, PUSH_TOKEN);
    await UserService.claimPushToken(user.id, newerToken);
    await UserService.clearPushToken(user.id, PUSH_TOKEN);

    await expect(prisma.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      pushToken: newerToken,
    });

    await UserService.clearPushToken(user.id, newerToken);
    await expect(prisma.user.findUnique({ where: { id: user.id } })).resolves.toMatchObject({
      pushToken: null,
    });
  });
});
