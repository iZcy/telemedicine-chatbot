// server/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Graceful shutdown function
export async function disconnectPrisma(): Promise<void> {
  try {
    console.log("🔌 Disconnecting Prisma client...");
    await prisma.$disconnect();
    console.log("✅ Prisma client disconnected successfully");
  } catch (error) {
    console.error("❌ Error disconnecting Prisma:", error);
    throw error;
  }
}

// Handle process termination
const handleShutdown = async (signal: string) => {
  console.log(`📡 Received ${signal}, starting graceful shutdown...`);
  try {
    await disconnectPrisma();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("beforeExit", () => {
  console.log("📤 Process beforeExit event");
  disconnectPrisma().catch(console.error);
});
