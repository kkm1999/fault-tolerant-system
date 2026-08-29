-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" TEXT,
    "metric" TEXT,
    "amount" REAL,
    "timestamp" DATETIME,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "rawPayload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_fingerprint_key" ON "Event"("fingerprint");
