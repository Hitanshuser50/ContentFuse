-- CreateTable
CREATE TABLE `UserSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `stripeCustomerId` VARCHAR(191) NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `stripePriceId` VARCHAR(191) NULL,
    `stripeCurrentPeriodEnd` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserSubscription_userId_key`(`userId`),
    UNIQUE INDEX `UserSubscription_stripeCustomerId_key`(`stripeCustomerId`),
    UNIQUE INDEX `UserSubscription_stripeSubscriptionId_key`(`stripeSubscriptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
