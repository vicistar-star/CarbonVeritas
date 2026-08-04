-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "transaction" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Challenge_wallet_idx" ON "Challenge"("wallet");

-- CreateIndex
CREATE INDEX "Challenge_expiresAt_idx" ON "Challenge"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_transaction_key" ON "Challenge"("transaction");
