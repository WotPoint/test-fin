"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.clearDb = clearDb;
const child_process_1 = require("child_process");
const client_1 = require("@prisma/client");
// Apply all migrations to the test DB before the suite starts
(0, child_process_1.execSync)('npx prisma migrate deploy', {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: 'file:./prisma/test.db' },
    stdio: 'pipe',
});
exports.prisma = new client_1.PrismaClient();
// Helper: wipe all tables in the correct FK order before each test
async function clearDb() {
    await exports.prisma.$transaction([
        exports.prisma.goalContribution.deleteMany(),
        exports.prisma.transaction.deleteMany(),
        exports.prisma.recurringTransaction.deleteMany(),
        exports.prisma.budget.deleteMany(),
        exports.prisma.subcategory.deleteMany(),
        exports.prisma.goal.deleteMany(),
        exports.prisma.category.deleteMany(),
        exports.prisma.account.deleteMany(),
    ]);
}
