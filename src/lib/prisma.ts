import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function createPrismaClient(): PrismaClient {
  const dbPath = path.join(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({
    url: `file:${dbPath}`,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Force fresh instance if schema updated
let prismaInstance: PrismaClient;
if (process.env.NODE_ENV !== "production") {
  prismaInstance = createPrismaClient();
  globalForPrisma.prisma = prismaInstance;
} else {
  prismaInstance = globalForPrisma.prisma ?? createPrismaClient();
}

export const prisma = prismaInstance;
