import { PrismaClient } from "@prisma/client";

// Single shared Prisma client (avoids exhausting DB connections in dev hot-reload).
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
