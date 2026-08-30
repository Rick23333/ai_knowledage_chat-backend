/*
  Warnings:

  - You are about to drop the column `title` on the `document` table. All the data in the column will be lost.
  - Added the required column `filename` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `document` DROP COLUMN `title`,
    ADD COLUMN `filename` VARCHAR(191) NOT NULL,
    MODIFY `filePath` VARCHAR(191) NULL;
