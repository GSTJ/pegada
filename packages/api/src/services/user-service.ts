import type { User } from "@prisma/client";

import prisma from "@pegada/database";

import { deleteImageFromS3 } from "../shared/file-upload";
import { isAllowedImageUrl } from "../shared/image-url";

export class UserService {
  /**
   * Hard-delete the user account and every record that depends on it.
   *
   * Required for App Store Guideline 5.1.1(v) — apps that allow account
   * creation must offer in-app account deletion. We delete in dependency
   * order because schema.prisma uses `relationMode = "prisma"` (no DB-level
   * ON DELETE CASCADE), so Prisma cannot fan out for us. Public image objects
   * are removed first, then the database rows are removed in one transaction.
   * A storage failure leaves the account row in place so deletion can be
   * retried.
   *
   * Order: messages → matches → interests → images → dogs → user.
   * Messages and matches reference dogs; interests reference dogs and
   * matches; images reference dogs; dogs reference the user.
   */
  static async deleteAccount(userId: string) {
    const dogs = await prisma.dog.findMany({
      where: { userId },
      select: { id: true, images: { select: { url: true } } },
    });
    const dogIds = dogs.map((d) => d.id);
    const imageUrls = dogs.flatMap((dog) =>
      dog.images.map((image) => image.url),
    );

    // Delete public objects before their database references disappear. A
    // failed storage deletion leaves the account intact so the request can be
    // retried without losing track of personal data that still needs removal.
    //
    // Photos on an origin this deployment is not configured for are skipped
    // rather than attempted. They are not ours to delete — a retired bucket, a
    // seeded fixture, anything from before the R2 move — and `storageForUrl`
    // refuses to route them, so asking would throw and leave the account
    // permanently undeletable. Guideline 5.1.1(v) requires the opposite, and
    // refusing buys nothing: there is no object of ours behind that URL to
    // keep. `DogService.updateDog` filters its deletions the same way.
    await Promise.all(
      // Not point-free: `isAllowedImageUrl`'s second parameter is the origin
      // set, and `filter` would hand it the array index.
      imageUrls
        .filter((url) => isAllowedImageUrl(url))
        .map((url) => deleteImageFromS3(url)),
    );

    await prisma.$transaction(async (tx) => {
      if (dogIds.length > 0) {
        await tx.message.deleteMany({
          where: {
            OR: [{ senderId: { in: dogIds } }, { receiverId: { in: dogIds } }],
          },
        });
        await tx.interest.deleteMany({
          where: {
            OR: [
              { requesterId: { in: dogIds } },
              { responderId: { in: dogIds } },
            ],
          },
        });
        await tx.match.deleteMany({
          where: {
            OR: [
              { requesterId: { in: dogIds } },
              { responderId: { in: dogIds } },
            ],
          },
        });
        await tx.image.deleteMany({ where: { dogId: { in: dogIds } } });
        await tx.dog.deleteMany({ where: { id: { in: dogIds } } });
      }

      await tx.user.delete({ where: { id: userId } });
    });
  }

  static blacklistPushToken(pushToken: string) {
    return prisma.user.updateMany({
      where: { pushToken },
      data: { pushToken: "" },
    });
  }

  static getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static updateUserById(
    id: string,
    data: Partial<Omit<User, "email" | "id" | "createdAt">>,
  ) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async getSubscriptionType(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    return user?.plan;
  }

  static createUser(data: User) {
    return prisma.user.create({
      data,
    });
  }
}
