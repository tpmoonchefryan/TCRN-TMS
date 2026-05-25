// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient as GeneratedPrismaClient } from '../../generated/prisma/client';

type GeneratedPrismaClientOptions = ConstructorParameters<typeof GeneratedPrismaClient>[0];
type AdapterPrismaClientOptions = Extract<GeneratedPrismaClientOptions, { adapter: unknown }>;
type PrismaClientOptions = Omit<AdapterPrismaClientOptions, 'adapter'> & {
  adapter?: AdapterPrismaClientOptions['adapter'];
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function shouldLogPrismaQueries() {
  const flag = process.env.PRISMA_QUERY_LOG?.trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on';
}

function createPrismaPgAdapter() {
  return new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
  });
}

export class PrismaClient extends GeneratedPrismaClient {
  constructor(options: PrismaClientOptions = {}) {
    const { adapter, log, ...rest } = options;

    super({
      ...rest,
      adapter: adapter ?? createPrismaPgAdapter(),
      log: log ?? (shouldLogPrismaQueries() ? ['query', 'error', 'warn'] : ['error', 'warn']),
    });
  }
}

export const createPrismaClient = (options: PrismaClientOptions = {}) => new PrismaClient(options);

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export { Prisma } from '../../generated/prisma/client';
