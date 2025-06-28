import { PrismaClient } from "@prisma/client";

// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

/* eslint-disable-next-line no-restricted-syntax -- Reading NODE_ENV is safe here for configuring Prisma logging */
const isDevelopment = process.env.NODE_ENV === "development";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ["query"] : []
  });

/* eslint-disable-next-line no-restricted-syntax -- Reading NODE_ENV is safe here */
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
