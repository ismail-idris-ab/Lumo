import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

// Singleton — avoid exhausting connections under tsx watch hot-reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDev ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (config.isDev) globalForPrisma.prisma = prisma;
