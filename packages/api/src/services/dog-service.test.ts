import prisma from "@pegada/database";
import { Gender } from "@prisma/client";

import { DogService } from "./dog-service";

// `enqueue` pulls in `errors.ts` -> `observability.ts` -> the ESM-only
// `magic-observability/node`, which jest can't parse. Same mock
// `enqueue.test.ts` uses to keep that chain out of suites that don't test it.
jest.mock("../errors/errors", () => ({
  sendError: jest.fn(),
  logDebug: () => undefined,
  errorDebug: () => undefined,
}));

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.image.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
});

const seedDog = async (email: string, imageUrl: string) => {
  const user = await prisma.user.create({ data: { email } });

  return prisma.dog.create({
    data: {
      name: "Rex",
      gender: Gender.MALE,
      userId: user.id,
      images: { create: { url: imageUrl, position: 0 } },
    },
    include: { images: true },
  });
};

describe("DogService.updateDog", () => {
  it("updates the server-owned image even when the client sends another image id", async () => {
    const [ownerDog, otherDog] = await Promise.all([
      seedDog("image-owner@pegada.app", "https://images.test/owner.webp"),
      seedDog("other-owner@pegada.app", "https://images.test/other.webp"),
    ]);
    const ownerImage = ownerDog.images[0]!;
    const otherImage = otherDog.images[0]!;

    await DogService.updateDog(ownerDog.id, {
      images: [
        {
          id: otherImage.id,
          url: ownerImage.url,
          position: 3,
        },
      ],
    });

    await expect(
      prisma.image.findUniqueOrThrow({ where: { id: ownerImage.id } }),
    ).resolves.toMatchObject({ position: 3 });
    await expect(
      prisma.image.findUniqueOrThrow({ where: { id: otherImage.id } }),
    ).resolves.toMatchObject({ position: 0 });
  });
});
