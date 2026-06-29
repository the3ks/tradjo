-- AlterTable
ALTER TABLE `TradeJournal`
  ADD COLUMN `entryTrigger` VARCHAR(240) NULL,
  ADD COLUMN `exitReason` VARCHAR(240) NULL;

-- CreateIndex
CREATE INDEX `TradeJournal_entryTrigger_idx` ON `TradeJournal`(`entryTrigger`);

-- CreateIndex
CREATE INDEX `TradeJournal_exitReason_idx` ON `TradeJournal`(`exitReason`);
