import prisma from "@pegada/database";

import { config } from "../shared/config";
import { deleteImageFromS3 } from "../shared/file-upload";
import { UserService } from "./user-service";

/**
 * The mock refuses foreign origins, because the real function does.
 *
 * `deleteImageFromS3` opens with `storageForUrl`, which opens with
 * `assertAllowedImageUrl` — a URL outside the configured storage origins never
 * reaches the S3 client, it throws. A bare `jest.fn()` returning undefined for
 * every input is what let an account become permanently undeletable without a
 * single red test: the suite's own fixture pointed at `https://images.test`,
 * an origin this service is not configured for, and the mock happily accepted
 * it.
 */
jest.mock("../shared/file-upload", () => {
  const { isAllowedImageUrl } = jest.requireActual<
    typeof import("../shared/image-url")
  >("../shared/image-url");

  return {
    deleteImageFromS3: jest.fn(async (url: string) => {
      if (!isAllowedImageUrl(url)) {
        throw new Error(
          "Image URL does not point at a configured storage origin",
        );
      }
    }),
  };
});

const deleteStoredImage = jest.mocked(deleteImageFromS3);

/** The legacy virtual-hosted S3 origin remains allowed in the test config. */
const BUCKET_URL = `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com`;
const STORED_PHOTO = `${BUCKET_URL}/dogs/luna.webp`;

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

const seedAccount = async (url = STORED_PHOTO) =>
  prisma.user.create({
    data: {
      email: "delete-storage-test@pegada.app",
      dogs: {
        create: {
          name: "Luna",
          gender: "FEMALE",
          images: { create: { url, position: 0 } },
        },
      },
    },
  });

test("removes stored photos before deleting an account", async () => {
  const user = await seedAccount();

  await UserService.deleteAccount(user.id);

  expect(deleteStoredImage).toHaveBeenCalledWith(STORED_PHOTO);
  await expect(
    prisma.user.findUnique({ where: { id: user.id } }),
  ).resolves.toBeNull();
});

test("removes outstanding upload objects and grants with the account", async () => {
  const user = await seedAccount();
  const temporaryUrl = `${BUCKET_URL}/dogs-temporary/pending.webp`;
  const permanentUrl = `${BUCKET_URL}/dogs/orphaned.webp`;
  await prisma.uploadGrant.create({
    data: {
      userId: user.id,
      temporaryUrl,
      permanentUrl,
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: new Date(),
    },
  });

  await UserService.deleteAccount(user.id);

  expect(deleteStoredImage).toHaveBeenCalledWith(temporaryUrl);
  expect(deleteStoredImage).toHaveBeenCalledWith(permanentUrl);
  await expect(
    prisma.uploadGrant.count({ where: { userId: user.id } }),
  ).resolves.toBe(0);
});

test("keeps the account when a stored photo cannot be removed", async () => {
  const user = await seedAccount();
  deleteStoredImage.mockRejectedValueOnce(new Error("storage unavailable"));

  await expect(UserService.deleteAccount(user.id)).rejects.toThrow(
    "storage unavailable",
  );
  await expect(
    prisma.user.findUnique({ where: { id: user.id } }),
  ).resolves.toMatchObject({ id: user.id });
});

/**
 * Guideline 5.1.1(v) says an account created in the app has to be deletable in
 * the app. A photo uploaded before the current storage origins were configured
 * — a retired bucket, a seeded fixture, anything from before the R2 move —
 * has nothing of ours behind it, and asking the storage layer to route it
 * throws. Letting that reject the whole operation does not protect the photo;
 * it makes the account permanently undeletable, which is the one outcome the
 * guideline forbids.
 *
 * `DogService.updateDog` already filters its deletions this way, with the same
 * reasoning written next to it. This is the path that was missed.
 */
test("deletes the account even when a photo is on a retired storage origin", async () => {
  const user = await seedAccount("https://placedog.net/640/480?id=42");

  await UserService.deleteAccount(user.id);

  expect(deleteStoredImage).not.toHaveBeenCalled();
  await expect(
    prisma.user.findUnique({ where: { id: user.id } }),
  ).resolves.toBeNull();
  await expect(prisma.image.count()).resolves.toBe(0);
  await expect(prisma.dog.count()).resolves.toBe(0);
});
