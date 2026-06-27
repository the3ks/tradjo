-- AlterTable
ALTER TABLE `Collection` ADD COLUMN `isPinned` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pinnedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Collection_userId_isPinned_pinnedAt_idx` ON `Collection`(`userId`, `isPinned`, `pinnedAt`);
