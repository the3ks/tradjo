-- CreateTable
CREATE TABLE `RawOrder` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `exchangeConnectionId` VARCHAR(191) NOT NULL,
    `exchangeOrderId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `marketType` ENUM('PERPETUAL', 'SPOT', 'FUTURES') NOT NULL,
    `side` VARCHAR(191) NULL,
    `orderType` VARCHAR(191) NULL,
    `price` DECIMAL(36, 18) NULL,
    `quantity` DECIMAL(36, 18) NULL,
    `filledQuantity` DECIMAL(36, 18) NULL,
    `status` ENUM('NEW', 'PARTIALLY_FILLED', 'FILLED', 'CANCELED', 'REJECTED', 'EXPIRED', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `createdTime` DATETIME(3) NULL,
    `updatedTime` DATETIME(3) NULL,
    `rawPayload` JSON NOT NULL,
    `isTerminal` BOOLEAN NOT NULL DEFAULT false,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RawOrder_userId_idx`(`userId`),
    INDEX `RawOrder_symbol_idx`(`symbol`),
    UNIQUE INDEX `RawOrder_exchangeConnectionId_exchangeOrderId_key`(`exchangeConnectionId`, `exchangeOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawFill` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `exchangeConnectionId` VARCHAR(191) NOT NULL,
    `exchangeFillId` VARCHAR(191) NOT NULL,
    `exchangeOrderId` VARCHAR(191) NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `marketType` ENUM('PERPETUAL', 'SPOT', 'FUTURES') NOT NULL,
    `side` VARCHAR(191) NULL,
    `price` DECIMAL(36, 18) NULL,
    `quantity` DECIMAL(36, 18) NULL,
    `fee` DECIMAL(36, 18) NULL,
    `feeCurrency` VARCHAR(191) NULL,
    `executedAt` DATETIME(3) NULL,
    `rawPayload` JSON NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RawFill_userId_idx`(`userId`),
    INDEX `RawFill_symbol_idx`(`symbol`),
    UNIQUE INDEX `RawFill_exchangeConnectionId_exchangeFillId_key`(`exchangeConnectionId`, `exchangeFillId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawPosition` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `exchangeConnectionId` VARCHAR(191) NOT NULL,
    `exchangePositionId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `marketType` ENUM('PERPETUAL', 'SPOT', 'FUTURES') NOT NULL,
    `side` VARCHAR(191) NULL,
    `quantity` DECIMAL(36, 18) NULL,
    `entryPrice` DECIMAL(36, 18) NULL,
    `markPrice` DECIMAL(36, 18) NULL,
    `unrealizedPnl` DECIMAL(36, 18) NULL,
    `realizedPnl` DECIMAL(36, 18) NULL,
    `openedAt` DATETIME(3) NULL,
    `updatedTime` DATETIME(3) NULL,
    `rawPayload` JSON NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RawPosition_userId_idx`(`userId`),
    INDEX `RawPosition_symbol_idx`(`symbol`),
    UNIQUE INDEX `RawPosition_exchangeConnectionId_exchangePositionId_key`(`exchangeConnectionId`, `exchangePositionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RawIncome` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `exchangeConnectionId` VARCHAR(191) NOT NULL,
    `exchangeIncomeId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NULL,
    `marketType` ENUM('PERPETUAL', 'SPOT', 'FUTURES') NOT NULL,
    `incomeType` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(36, 18) NULL,
    `asset` VARCHAR(191) NULL,
    `occurredAt` DATETIME(3) NULL,
    `rawPayload` JSON NOT NULL,
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RawIncome_userId_idx`(`userId`),
    INDEX `RawIncome_symbol_idx`(`symbol`),
    INDEX `RawIncome_incomeType_idx`(`incomeType`),
    UNIQUE INDEX `RawIncome_exchangeConnectionId_exchangeIncomeId_key`(`exchangeConnectionId`, `exchangeIncomeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trade` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `collectionId` VARCHAR(191) NOT NULL,
    `collectionSyncSourceId` VARCHAR(191) NULL,
    `exchangeConnectionId` VARCHAR(191) NOT NULL,
    `externalTradeId` VARCHAR(191) NOT NULL,
    `sourceRecordType` VARCHAR(191) NOT NULL,
    `sourceRecordId` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `marketType` ENUM('PERPETUAL', 'SPOT', 'FUTURES') NOT NULL,
    `side` VARCHAR(191) NULL,
    `status` ENUM('OPEN', 'CLOSED', 'SETTLED', 'ARCHIVED') NOT NULL DEFAULT 'OPEN',
    `quantity` DECIMAL(36, 18) NULL,
    `entryPrice` DECIMAL(36, 18) NULL,
    `exitPrice` DECIMAL(36, 18) NULL,
    `grossPnl` DECIMAL(36, 18) NULL,
    `tradingFee` DECIMAL(36, 18) NULL,
    `fundingFee` DECIMAL(36, 18) NULL,
    `netPnl` DECIMAL(36, 18) NULL,
    `openedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `settledAt` DATETIME(3) NULL,
    `rawSummary` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Trade_userId_idx`(`userId`),
    INDEX `Trade_collectionId_idx`(`collectionId`),
    INDEX `Trade_symbol_idx`(`symbol`),
    INDEX `Trade_marketType_idx`(`marketType`),
    INDEX `Trade_status_idx`(`status`),
    UNIQUE INDEX `Trade_collectionId_externalTradeId_key`(`collectionId`, `externalTradeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExchangeSyncLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `collectionSyncSourceId` VARCHAR(191) NULL,
    `exchangeConnectionId` VARCHAR(191) NOT NULL,
    `syncType` ENUM('INITIAL', 'INCREMENTAL', 'RECENT_REFRESH', 'FORCE_RESYNC') NOT NULL,
    `status` ENUM('RUNNING', 'SUCCESS', 'FAILED') NOT NULL,
    `startedAt` DATETIME(3) NOT NULL,
    `finishedAt` DATETIME(3) NULL,
    `fetchedCount` INTEGER NOT NULL DEFAULT 0,
    `createdCount` INTEGER NOT NULL DEFAULT 0,
    `updatedCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExchangeSyncLog_userId_idx`(`userId`),
    INDEX `ExchangeSyncLog_collectionSyncSourceId_idx`(`collectionSyncSourceId`),
    INDEX `ExchangeSyncLog_exchangeConnectionId_idx`(`exchangeConnectionId`),
    INDEX `ExchangeSyncLog_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `RawOrder` ADD CONSTRAINT `RawOrder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawOrder` ADD CONSTRAINT `RawOrder_exchangeConnectionId_fkey` FOREIGN KEY (`exchangeConnectionId`) REFERENCES `ExchangeConnection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawFill` ADD CONSTRAINT `RawFill_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawFill` ADD CONSTRAINT `RawFill_exchangeConnectionId_fkey` FOREIGN KEY (`exchangeConnectionId`) REFERENCES `ExchangeConnection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawPosition` ADD CONSTRAINT `RawPosition_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawPosition` ADD CONSTRAINT `RawPosition_exchangeConnectionId_fkey` FOREIGN KEY (`exchangeConnectionId`) REFERENCES `ExchangeConnection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawIncome` ADD CONSTRAINT `RawIncome_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RawIncome` ADD CONSTRAINT `RawIncome_exchangeConnectionId_fkey` FOREIGN KEY (`exchangeConnectionId`) REFERENCES `ExchangeConnection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_collectionId_fkey` FOREIGN KEY (`collectionId`) REFERENCES `Collection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_collectionSyncSourceId_fkey` FOREIGN KEY (`collectionSyncSourceId`) REFERENCES `CollectionSyncSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_exchangeConnectionId_fkey` FOREIGN KEY (`exchangeConnectionId`) REFERENCES `ExchangeConnection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExchangeSyncLog` ADD CONSTRAINT `ExchangeSyncLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExchangeSyncLog` ADD CONSTRAINT `ExchangeSyncLog_collectionSyncSourceId_fkey` FOREIGN KEY (`collectionSyncSourceId`) REFERENCES `CollectionSyncSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExchangeSyncLog` ADD CONSTRAINT `ExchangeSyncLog_exchangeConnectionId_fkey` FOREIGN KEY (`exchangeConnectionId`) REFERENCES `ExchangeConnection`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
