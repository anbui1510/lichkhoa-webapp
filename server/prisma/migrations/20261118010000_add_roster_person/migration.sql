-- CreateTable: RosterPerson — danh sách tên + role (F-104 / Story 1.3)
CREATE TABLE "RosterPerson" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "linkedUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RosterPerson_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RosterPerson_linkedUserId_key" ON "RosterPerson"("linkedUserId");
