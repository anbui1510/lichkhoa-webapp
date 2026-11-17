-- AlterTable: User.role — SoT quyền Admin (F-102 / Story 1.1)
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT '';
