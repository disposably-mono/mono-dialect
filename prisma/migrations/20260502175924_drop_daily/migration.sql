/*
  Warnings:

  - You are about to drop the `DailyStats` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DailyWord` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DailyStats" DROP CONSTRAINT "DailyStats_userId_fkey";

-- DropTable
DROP TABLE "DailyStats";

-- DropTable
DROP TABLE "DailyWord";
