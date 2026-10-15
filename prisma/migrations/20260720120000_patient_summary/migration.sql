-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "summary" JSONB,
ADD COLUMN     "summaryGeneratedAt" TIMESTAMP(3),
ADD COLUMN     "summarySessionCount" INTEGER;
