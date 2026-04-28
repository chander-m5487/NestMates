/**
 * Seed file — no DB seeding required for geo data.
 * Countries and states live in src/lib/geo.ts (hardcoded constants).
 * The Country + State DB models were removed (SC-015: dead schema cleanup).
 *
 * This file is kept as a placeholder for future seed needs
 * (e.g. default admin user, initial notifications config).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed: nothing to seed (geo data is in src/lib/geo.ts).');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
