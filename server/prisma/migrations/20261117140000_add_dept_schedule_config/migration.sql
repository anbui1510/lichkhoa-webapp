-- CreateTable: DeptScheduleConfig — Spreadsheet SoT tham chiếu (F-103 / Story 1.2)
CREATE TABLE "DeptScheduleConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "spreadsheetId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "verifiedAt" DATETIME,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("id")
);
