-- Create BankImport table
CREATE TABLE "BankImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL DEFAULT 'alfa',
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0
);

-- Add new columns to Transaction
ALTER TABLE "Transaction" ADD COLUMN "bankImportId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "externalRef" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "source" TEXT;

-- Unique index for deduplication
CREATE UNIQUE INDEX "Transaction_externalRef_key" ON "Transaction"("externalRef");
