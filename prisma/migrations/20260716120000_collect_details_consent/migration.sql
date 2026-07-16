-- AlterTable
ALTER TABLE "AssessmentSession" ADD COLUMN     "collectDetails" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentPolicyVersion" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "detailsUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "QuestionnaireResponse" ADD COLUMN     "intakeAnswers" JSONB;

