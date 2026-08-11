-- CreateTable
CREATE TYPE "BridgeStatus" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "BridgeRecord" (
    "id" TEXT NOT NULL,
    "creditId" INTEGER NOT NULL,
    "sourceRegistry" TEXT NOT NULL,
    "sourceSerial" TEXT NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "status" "BridgeStatus" NOT NULL DEFAULT 'INBOUND',
    "bridgerId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BridgeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BridgeRecord_sourceRegistry_sourceSerial_key" ON "BridgeRecord"("sourceRegistry", "sourceSerial");

-- CreateIndex
CREATE INDEX "BridgeRecord_creditId_idx" ON "BridgeRecord"("creditId");

-- CreateIndex
CREATE INDEX "BridgeRecord_bridgerId_idx" ON "BridgeRecord"("bridgerId");

-- CreateIndex
CREATE INDEX "BridgeRecord_status_idx" ON "BridgeRecord"("status");

-- AddForeignKey
ALTER TABLE "BridgeRecord" ADD CONSTRAINT "BridgeRecord_bridgerId_fkey" FOREIGN KEY ("bridgerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
