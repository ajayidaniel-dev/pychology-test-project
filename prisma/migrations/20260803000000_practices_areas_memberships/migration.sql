-- Phase 1 of the tenancy work: practices become the tenant.
--
-- Adds Practice / Area / Membership / PracticeInvitation / AuditEntry, and a
-- practiceId on every owned table. practiceId is NOT NULL because this landed
-- against a deliberately emptied database (backup taken first), so the Phase 2
-- backfill in docs/tenancy-implementation-plan.md was not needed.
--
-- Patient uniqueness moves from (anonymousId, psychologistId) to
-- (practiceId, anonymousId): a globally unique anonymous id would be a
-- correlation key across tenants.
--
-- Also repairs pre-existing drift: QuestionnaireResponse.reviewedAt and
-- .escalatedAt were present in schema.prisma and in the live database but in no
-- migration, so a deploy built purely from migrations would have lacked them.

-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('ABNORMAL', 'BIOPSYCHOLOGY', 'SOCIAL', 'COGNITIVE', 'DEVELOPMENTAL', 'PERSONALITY', 'FORENSIC', 'INDUSTRIAL_ORGANIZATIONAL', 'CLINICAL', 'COUNSELLING', 'OTHER');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'CLINICIAN', 'SUPERVISOR', 'FRONT_DESK');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEPARTED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- DropIndex
DROP INDEX "Patient_anonymousId_psychologistId_key";

-- AlterTable
ALTER TABLE "ClinicalSession" ADD COLUMN     "practiceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "practiceId" TEXT NOT NULL;

-- AlterTable
-- Nullable: LOGIN notifications belong to the account, not to any practice, and
-- are raised before a practice has been resolved at all.
ALTER TABLE "Notification" ADD COLUMN     "practiceId" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "practiceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Questionnaire" ADD COLUMN     "practiceId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "QuestionnaireResponse" ADD COLUMN     "escalatedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Scale" ADD COLUMN     "practiceId" TEXT;

-- AlterTable
ALTER TABLE "SessionBatch" ADD COLUMN     "practiceId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Practice" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "PracticeStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "registrationNumber" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "country" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" "Specialty",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'CLINICIAN',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "licenceNumber" TEXT,
    "supervisorId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipArea" (
    "membershipId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipArea_pkey" PRIMARY KEY ("membershipId","areaId")
);

-- CreateTable
CREATE TABLE "PatientArea" (
    "patientId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientArea_pkey" PRIMARY KEY ("patientId","areaId")
);

-- CreateTable
CREATE TABLE "PracticeInvitation" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'CLINICIAN',
    "token" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "practiceId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Practice_slug_key" ON "Practice"("slug");

-- CreateIndex
CREATE INDEX "Practice_status_idx" ON "Practice"("status");

-- CreateIndex
CREATE INDEX "Area_practiceId_idx" ON "Area"("practiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Area_practiceId_name_key" ON "Area"("practiceId", "name");

-- CreateIndex
CREATE INDEX "Membership_practiceId_status_idx" ON "Membership"("practiceId", "status");

-- CreateIndex
CREATE INDEX "Membership_supervisorId_idx" ON "Membership"("supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_practiceId_key" ON "Membership"("userId", "practiceId");

-- CreateIndex
CREATE INDEX "MembershipArea_areaId_idx" ON "MembershipArea"("areaId");

-- CreateIndex
CREATE INDEX "PatientArea_areaId_idx" ON "PatientArea"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeInvitation_token_key" ON "PracticeInvitation"("token");

-- CreateIndex
CREATE INDEX "PracticeInvitation_practiceId_status_idx" ON "PracticeInvitation"("practiceId", "status");

-- CreateIndex
CREATE INDEX "PracticeInvitation_email_idx" ON "PracticeInvitation"("email");

-- CreateIndex
CREATE INDEX "AuditEntry_practiceId_createdAt_idx" ON "AuditEntry"("practiceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEntry_practiceId_subjectType_subjectId_idx" ON "AuditEntry"("practiceId", "subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "AuditEntry_actorId_idx" ON "AuditEntry"("actorId");

-- CreateIndex
CREATE INDEX "ClinicalSession_practiceId_scheduledAt_idx" ON "ClinicalSession"("practiceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ClinicalSession_practiceId_status_idx" ON "ClinicalSession"("practiceId", "status");

-- CreateIndex
CREATE INDEX "ClinicalSession_psychologistId_idx" ON "ClinicalSession"("psychologistId");

-- CreateIndex
CREATE INDEX "Note_practiceId_createdAt_idx" ON "Note"("practiceId", "createdAt");

-- CreateIndex
CREATE INDEX "Note_authorId_idx" ON "Note"("authorId");

-- CreateIndex
CREATE INDEX "Notification_practiceId_userId_readAt_idx" ON "Notification"("practiceId", "userId", "readAt");

-- CreateIndex
CREATE INDEX "Patient_practiceId_createdAt_idx" ON "Patient"("practiceId", "createdAt");

-- CreateIndex
CREATE INDEX "Patient_psychologistId_idx" ON "Patient"("psychologistId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_practiceId_anonymousId_key" ON "Patient"("practiceId", "anonymousId");

-- CreateIndex
CREATE INDEX "Questionnaire_practiceId_status_idx" ON "Questionnaire"("practiceId", "status");

-- CreateIndex
CREATE INDEX "Questionnaire_scaleId_idx" ON "Questionnaire"("scaleId");

-- CreateIndex
CREATE INDEX "Scale_practiceId_idx" ON "Scale"("practiceId");

-- CreateIndex
CREATE INDEX "Scale_psychologistId_idx" ON "Scale"("psychologistId");

-- CreateIndex
CREATE INDEX "SessionBatch_practiceId_createdAt_idx" ON "SessionBatch"("practiceId", "createdAt");

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipArea" ADD CONSTRAINT "MembershipArea_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipArea" ADD CONSTRAINT "MembershipArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientArea" ADD CONSTRAINT "PatientArea_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientArea" ADD CONSTRAINT "PatientArea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvitation" ADD CONSTRAINT "PracticeInvitation_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvitation" ADD CONSTRAINT "PracticeInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scale" ADD CONSTRAINT "Scale_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalSession" ADD CONSTRAINT "ClinicalSession_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionBatch" ADD CONSTRAINT "SessionBatch_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_practiceId_fkey" FOREIGN KEY ("practiceId") REFERENCES "Practice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
