-- AlterTable
ALTER TABLE "QuestionnaireResponse" ADD COLUMN IF NOT EXISTS "narrative" JSONB,
ADD COLUMN IF NOT EXISTS "narrativeGeneratedAt" TIMESTAMP(3);
