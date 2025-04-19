import { User } from "@prisma/client";

import prisma from "@pegada/database";

export class UserService {
  static blacklistPushToken(pushToken: string) {
    return prisma.user.updateMany({
      where: { pushToken },
      data: { pushToken: "" }
    });
  }

  static getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  static updateUserById(
    id: string,
    data: Partial<Omit<User, "email" | "id" | "createdAt">>
  ) {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  static async getSubscriptionType(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true }
    });

    return user?.plan;
  }

  static async createUser(data: User) {
    return prisma.user.create({
      data
    });
  }
}
