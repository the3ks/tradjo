-- CreateTable
CREATE TABLE `PortfolioPosition` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `assetClass` ENUM('CASH', 'CRYPTO', 'STOCK', 'FOREX', 'COMMODITY') NOT NULL,
    `positionType` ENUM('BALANCE', 'SPOT', 'FUTURES') NOT NULL,
    `exchange` VARCHAR(191) NULL,
    `currentQuantity` DECIMAL(36, 18) NOT NULL,
    `averageCost` DECIMAL(36, 18) NOT NULL,
    `realizedPnl` DECIMAL(36, 18) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PortfolioPosition_userId_idx`(`userId`),
    INDEX `PortfolioPosition_assetClass_idx`(`assetClass`),
    INDEX `PortfolioPosition_positionType_idx`(`positionType`),
    INDEX `PortfolioPosition_exchange_idx`(`exchange`),
    UNIQUE INDEX `PortfolioPosition_userId_symbol_assetClass_positionType_exch_key`(`userId`, `symbol`, `assetClass`, `positionType`, `exchange`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PortfolioLedger` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `positionId` VARCHAR(191) NOT NULL,
    `action` ENUM('DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 'FEE', 'FUNDING', 'DIVIDEND', 'TRANSFER_IN', 'TRANSFER_OUT') NOT NULL,
    `quantityChange` DECIMAL(36, 18) NOT NULL,
    `price` DECIMAL(36, 18) NOT NULL,
    `feeAmount` DECIMAL(36, 18) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL,
    `linkedLedgerId` VARCHAR(191) NULL,
    `transactionDate` DATETIME(3) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `rawPayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PortfolioLedger_linkedLedgerId_key`(`linkedLedgerId`),
    INDEX `PortfolioLedger_userId_idx`(`userId`),
    INDEX `PortfolioLedger_positionId_idx`(`positionId`),
    INDEX `PortfolioLedger_transactionDate_idx`(`transactionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PortfolioPosition` ADD CONSTRAINT `PortfolioPosition_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioLedger` ADD CONSTRAINT `PortfolioLedger_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioLedger` ADD CONSTRAINT `PortfolioLedger_positionId_fkey` FOREIGN KEY (`positionId`) REFERENCES `PortfolioPosition`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PortfolioLedger` ADD CONSTRAINT `PortfolioLedger_linkedLedgerId_fkey` FOREIGN KEY (`linkedLedgerId`) REFERENCES `PortfolioLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
