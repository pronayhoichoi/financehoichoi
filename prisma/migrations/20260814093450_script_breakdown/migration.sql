-- CreateEnum
CREATE TYPE "SceneInt" AS ENUM ('INT', 'EXT', 'INT_EXT');

-- CreateEnum
CREATE TYPE "SceneTime" AS ENUM ('DAY', 'NIGHT', 'DAWN', 'DUSK');

-- CreateEnum
CREATE TYPE "ElementCategory" AS ENUM ('CAST', 'EXTRAS', 'PROPS', 'WARDROBE', 'MAKEUP', 'VEHICLES', 'SFX', 'STUNTS', 'ART', 'EQUIPMENT', 'LOCATION', 'MISC');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "scriptFileName" TEXT,
ADD COLUMN     "scriptFileUrl" TEXT;

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "intExt" "SceneInt" NOT NULL DEFAULT 'INT',
    "setName" TEXT NOT NULL,
    "time" "SceneTime" NOT NULL DEFAULT 'DAY',
    "pageEighths" INTEGER,
    "synopsis" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakdownElement" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "category" "ElementCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "estimatedCost" DECIMAL(14,2),
    "budgetLineId" TEXT,

    CONSTRAINT "BreakdownElement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scene_projectId_idx" ON "Scene"("projectId");

-- CreateIndex
CREATE INDEX "BreakdownElement_sceneId_idx" ON "BreakdownElement"("sceneId");

-- CreateIndex
CREATE INDEX "BreakdownElement_budgetLineId_idx" ON "BreakdownElement"("budgetLineId");

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownElement" ADD CONSTRAINT "BreakdownElement_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakdownElement" ADD CONSTRAINT "BreakdownElement_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
