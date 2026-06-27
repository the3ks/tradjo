-- CreateTable
CREATE TABLE `TradeJournal` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tradeId` VARCHAR(191) NOT NULL,
    `strategy` VARCHAR(120) NULL,
    `setup` VARCHAR(160) NULL,
    `notes` TEXT NULL,
    `emotion` VARCHAR(80) NULL,
    `review` TEXT NULL,
    `grade` VARCHAR(24) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TradeJournal_userId_idx`(`userId`),
    INDEX `TradeJournal_strategy_idx`(`strategy`),
    INDEX `TradeJournal_setup_idx`(`setup`),
    INDEX `TradeJournal_emotion_idx`(`emotion`),
    INDEX `TradeJournal_grade_idx`(`grade`),
    UNIQUE INDEX `TradeJournal_tradeId_key`(`tradeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TradeMistakeTag` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TradeMistakeTag_userId_idx`(`userId`),
    UNIQUE INDEX `TradeMistakeTag_userId_name_key`(`userId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TradeJournalMistakeTag` (
    `tradeJournalId` VARCHAR(191) NOT NULL,
    `mistakeTagId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TradeJournalMistakeTag_mistakeTagId_idx`(`mistakeTagId`),
    PRIMARY KEY (`tradeJournalId`, `mistakeTagId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TradeScreenshot` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tradeId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(120) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `storagePath` VARCHAR(500) NOT NULL,
    `caption` VARCHAR(240) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TradeScreenshot_userId_idx`(`userId`),
    INDEX `TradeScreenshot_tradeId_idx`(`tradeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSuggestionValue` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `category` VARCHAR(40) NOT NULL,
    `value` VARCHAR(500) NOT NULL,
    `frequency` INTEGER NOT NULL DEFAULT 1,
    `lastUsedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserSuggestionValue_userId_category_lastUsedAt_idx`(`userId`, `category`, `lastUsedAt`),
    INDEX `UserSuggestionValue_userId_category_frequency_idx`(`userId`, `category`, `frequency`),
    UNIQUE INDEX `UserSuggestionValue_userId_category_value_key`(`userId`, `category`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TradeJournal` ADD CONSTRAINT `TradeJournal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeJournal` ADD CONSTRAINT `TradeJournal_tradeId_fkey` FOREIGN KEY (`tradeId`) REFERENCES `Trade`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeMistakeTag` ADD CONSTRAINT `TradeMistakeTag_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeJournalMistakeTag` ADD CONSTRAINT `TradeJournalMistakeTag_tradeJournalId_fkey` FOREIGN KEY (`tradeJournalId`) REFERENCES `TradeJournal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeJournalMistakeTag` ADD CONSTRAINT `TradeJournalMistakeTag_mistakeTagId_fkey` FOREIGN KEY (`mistakeTagId`) REFERENCES `TradeMistakeTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeScreenshot` ADD CONSTRAINT `TradeScreenshot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeScreenshot` ADD CONSTRAINT `TradeScreenshot_tradeId_fkey` FOREIGN KEY (`tradeId`) REFERENCES `Trade`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSuggestionValue` ADD CONSTRAINT `UserSuggestionValue_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
