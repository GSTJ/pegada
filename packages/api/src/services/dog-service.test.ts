import prisma from "@pegada/database";
import { Gender } from "@prisma/client";

import { config } from "../shared/config";
import { deleteImageFromS3 } from "../shared/file-upload";
import { DogService } from "./dog-service";

// `enqueue` pulls in `errors.ts` -> `observability.ts` -> the ESM-only
// `magic-observability/node`, which jest can't parse. Same mock
// `enqueue.test.ts` uses to keep that chain out of suites that don't test it.
jest.mock("../errors/errors", () => ({
  sendError: jest.fn(),
  logDebug: () => undefined,
  errorDebug: () => undefined,
}));

jest.mock("../shared/file-upload", () => {
  const actual = jest.requireActual<typeof import("../shared/file-upload")>(
    "../shared/file-upload",
  );

  return {
    ...actual,
    deleteImageFromS3: jest.fn(async () => undefined),
  };
});

const deleteStoredImage = jest.mocked(deleteImageFromS3);

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.uploadGrant.deleteMany();
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

describe("DogService.deleteDog", () => {
  it("deletes the public object before removing its database row", async () => {
    const storedUrl = `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/dogs/delete.webp`;
    const dog = await seedDog("delete-image-owner@pegada.app", storedUrl);

    await DogService.deleteDog(dog.id);

    expect(deleteStoredImage).toHaveBeenCalledWith(storedUrl);
    await expect(
      prisma.image.count({ where: { dogId: dog.id } }),
    ).resolves.toBe(0);
    await expect(
      prisma.dog.findUniqueOrThrow({ where: { id: dog.id } }),
    ).resolves.toMatchObject({ deletedAt: expect.any(Date) });
  });
});
