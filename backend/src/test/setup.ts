import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

// Apply all migrations to the test DB before the suite starts
execSync('npx prisma migrate deploy', {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: 'file:./prisma/test.db' },
  stdio: 'pipe',
});

export const prisma = new PrismaClient();

// Helper: wipe all tables in the correct FK order before each test
export async function clearDb() {
  await prisma.$transaction([
    prisma.goalContribution.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.recurringTransaction.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.subcategory.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.category.deleteMany(),
    prisma.account.deleteMany(),
  ]);
}
