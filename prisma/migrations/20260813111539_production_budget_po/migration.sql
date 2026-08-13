-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('FILM', 'SERIES', 'SHORT', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PRE_PRODUCTION', 'PRODUCTION', 'POST', 'RELEASED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REVISION');

-- CreateEnum
CREATE TYPE "PoStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_FULFILLED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "genre" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PRE_PRODUCTION',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "businessUnit" TEXT,
    "producer" TEXT,
    "budgetOwnerUserId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "commissioned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetHeader" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "budgetHeaderId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "ledger" TEXT,
    "description" TEXT NOT NULL,
    "approvedAmount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "PoStatus" NOT NULL DEFAULT 'DRAFT',
    "deliveryDate" TIMESTAMP(3),
    "notes" TEXT,
    "budgetOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "budgetLineId" TEXT,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL,
    "rate" DECIMAL(14,2) NOT NULL,
    "taxPct" DECIMAL(5,2),
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "PoLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "BudgetHeader_projectId_idx" ON "BudgetHeader"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetHeader_projectId_version_key" ON "BudgetHeader"("projectId", "version");

-- CreateIndex
CREATE INDEX "BudgetLine_budgetHeaderId_idx" ON "BudgetLine"("budgetHeaderId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_projectId_idx" ON "PurchaseOrder"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PoLine_purchaseOrderId_idx" ON "PoLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PoLine_budgetLineId_idx" ON "PoLine"("budgetLineId");

-- AddForeignKey
ALTER TABLE "BudgetHeader" ADD CONSTRAINT "BudgetHeader_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_budgetHeaderId_fkey" FOREIGN KEY ("budgetHeaderId") REFERENCES "BudgetHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoLine" ADD CONSTRAINT "PoLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoLine" ADD CONSTRAINT "PoLine_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
