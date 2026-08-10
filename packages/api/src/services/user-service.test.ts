import prisma from "@pegada/database";

import { deleteImageFromS3 } from "../shared/file-upload";
import { UserService } from "./user-service";

jest.mock("../shared/file-upload", () => ({
  deleteImageFromS3: jest.fn(),
}));

const deleteStoredImage = jest.mocked(deleteImageFromS3);

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

const seedAccount = async () =>
  prisma.user.create({
    data: {
      email: "delete-storage-test@pegada.app",
      dogs: {
        create: {
          name: "Luna",
          gender: "FEMALE",
          images: {
            create: {
              url: "https://images.test/dogs/luna.webp",
              position: 0,
            },
          },
        },
      },
    },
  });

test("removes stored photos before deleting an account", async () => {
  const user = await seedAccount();

  await UserService.deleteAccount(user.id);

  expect(deleteStoredImage).toHaveBeenCalledWith(
    "https://images.test/dogs/luna.webp",
  );
  await expect(
    prisma.user.findUnique({ where: { id: user.id } }),
  ).resolves.toBeNull();
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
