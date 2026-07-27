import { User } from "@prisma/client";

import prisma from "@pegada/database";

export class UserService {
  /**
   * Hard-delete the user account and every record that depends on it.
   *
   * Required for App Store Guideline 5.1.1(v) — apps that allow account
   * creation must offer in-app account deletion. We delete in dependency
   * order because schema.prisma uses `relationMode = "prisma"` (no DB-level
   * ON DELETE CASCADE), so Prisma cannot fan out for us. Wrapping in a
   * transaction guarantees atomicity: either every artifact is gone or
   * nothing changes.
   *
   * Order: messages → matches → interests → images → dogs → user.
   * Messages and matches reference dogs; interests reference dogs and
   * matches; images reference dogs; dogs reference the user.
   */
  static async deleteAccount(userId: string) {
    const dogs = await prisma.dog.findMany({
      where: { userId },
      select: { id: true },
    });
    const dogIds = dogs.map((d) => d.id);

    await prisma.$transaction(async (tx) => {
      if (dogIds.length > 0) {
        await tx.message.deleteMany({
          where: {
            OR: [{ senderId: { in: dogIds } }, { receiverId: { in: dogIds } }],
          },
        });
        await tx.interest.deleteMany({
          where: {
            OR: [{ requesterId: { in: dogIds } }, { responderId: { in: dogIds } }],
          },
        });
        await tx.match.deleteMany({
          where: {
            OR: [{ requesterId: { in: dogIds } }, { responderId: { in: dogIds } }],
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

  static updateUserById(id: string, data: Partial<Omit<User, "email" | "id" | "createdAt">>) {
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

  static async createUser(data: User) {
    return prisma.user.create({
      data,
    });
  }
}
