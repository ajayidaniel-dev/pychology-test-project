-- Split sessions from questionnaires.
--
-- Before: AssessmentSession WAS a questionnaire (it held scaleId, the fill
-- token and the consent stamps). After: ClinicalSession is an appointment that
-- owns the token, and Questionnaire is a scale attached to that appointment.
-- Every pre-existing questionnaire is wrapped in its own auto-created session
-- so no history is lost.

-- 1. New enums -------------------------------------------------------------
ALTER TYPE "SessionStatus" RENAME TO "QuestionnaireStatus";

CREATE TYPE "ClinicalSessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- 2. Rename AssessmentSession -> Questionnaire ------------------------------
ALTER TABLE "AssessmentSession" RENAME TO "Questionnaire";
ALTER TABLE "Questionnaire" RENAME CONSTRAINT "AssessmentSession_pkey" TO "Questionnaire_pkey";
ALTER INDEX "AssessmentSession_token_key" RENAME TO "Questionnaire_token_key";
ALTER TABLE "Questionnaire" RENAME CONSTRAINT "AssessmentSession_patientId_fkey" TO "Questionnaire_patientId_fkey";
ALTER TABLE "Questionnaire" RENAME CONSTRAINT "AssessmentSession_psychologistId_fkey" TO "Questionnaire_psychologistId_fkey";
ALTER TABLE "Questionnaire" RENAME CONSTRAINT "AssessmentSession_scaleId_fkey" TO "Questionnaire_scaleId_fkey";

ALTER TABLE "Questionnaire" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "Questionnaire" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 1;

-- 3. ClinicalSession --------------------------------------------------------
CREATE TABLE "ClinicalSession" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "psychologistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "ClinicalSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "token" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "collectDetails" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "consentPolicyVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicalSession_token_key" ON "ClinicalSession"("token");
CREATE INDEX "ClinicalSession_patientId_scheduledAt_idx" ON "ClinicalSession"("patientId", "scheduledAt");

ALTER TABLE "ClinicalSession" ADD CONSTRAINT "ClinicalSession_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClinicalSession" ADD CONSTRAINT "ClinicalSession_psychologistId_fkey"
    FOREIGN KEY ("psychologistId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Backfill: one session per existing questionnaire -----------------------
-- The session reuses the questionnaire's own id as a deterministic key so the
-- UPDATE below can match them without a temp table.
INSERT INTO "ClinicalSession" (
    "id", "patientId", "psychologistId", "title", "reason", "scheduledAt",
    "status", "token", "tokenExpiresAt", "collectDetails", "consentAt",
    "consentPolicyVersion", "createdAt"
)
SELECT
    'cs_' || q."id",
    q."patientId",
    q."psychologistId",
    s."name" || ' assessment',
    NULL,
    q."createdAt",
    CASE WHEN q."status" = 'COMPLETED' THEN 'COMPLETED'::"ClinicalSessionStatus"
         ELSE 'SCHEDULED'::"ClinicalSessionStatus" END,
    q."token",
    q."tokenExpiresAt",
    q."collectDetails",
    q."consentAt",
    q."consentPolicyVersion",
    q."createdAt"
FROM "Questionnaire" q
JOIN "Scale" s ON s."id" = q."scaleId";

UPDATE "Questionnaire" SET "sessionId" = 'cs_' || "id";

-- 5. Lock in the parent link, drop the columns that moved -------------------
ALTER TABLE "Questionnaire" ALTER COLUMN "sessionId" SET NOT NULL;
ALTER TABLE "Questionnaire" ADD CONSTRAINT "Questionnaire_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ClinicalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Questionnaire_sessionId_order_idx" ON "Questionnaire"("sessionId", "order");

DROP INDEX "Questionnaire_token_key";
ALTER TABLE "Questionnaire" DROP CONSTRAINT "Questionnaire_patientId_fkey";
ALTER TABLE "Questionnaire" DROP CONSTRAINT "Questionnaire_psychologistId_fkey";
ALTER TABLE "Questionnaire"
    DROP COLUMN "patientId",
    DROP COLUMN "psychologistId",
    DROP COLUMN "token",
    DROP COLUMN "tokenExpiresAt",
    DROP COLUMN "collectDetails",
    DROP COLUMN "consentAt",
    DROP COLUMN "consentPolicyVersion";

-- 6. QuestionnaireResponse.sessionId -> questionnaireId ---------------------
ALTER TABLE "QuestionnaireResponse" RENAME COLUMN "sessionId" TO "questionnaireId";
ALTER INDEX "QuestionnaireResponse_sessionId_key" RENAME TO "QuestionnaireResponse_questionnaireId_key";
ALTER TABLE "QuestionnaireResponse" RENAME CONSTRAINT "QuestionnaireResponse_sessionId_fkey" TO "QuestionnaireResponse_questionnaireId_fkey";

-- 7. Notes ------------------------------------------------------------------
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "questionnaireId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Note_patientId_createdAt_idx" ON "Note"("patientId", "createdAt");
CREATE INDEX "Note_sessionId_idx" ON "Note"("sessionId");
CREATE INDEX "Note_questionnaireId_idx" ON "Note"("questionnaireId");

ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ClinicalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Note" ADD CONSTRAINT "Note_questionnaireId_fkey"
    FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Notification: sessionId now means ClinicalSession ----------------------
-- Existing rows' sessionId held a questionnaire id, so move it across and
-- point sessionId at the wrapper session created in step 4.
ALTER TABLE "Notification" ADD COLUMN "questionnaireId" TEXT;
UPDATE "Notification" SET "questionnaireId" = "sessionId" WHERE "sessionId" IS NOT NULL;
UPDATE "Notification" SET "sessionId" = 'cs_' || "questionnaireId" WHERE "questionnaireId" IS NOT NULL;

-- Link-expiry alerts are rebuilt from live state on every reconcile pass and
-- their dedupe keys are changing shape, so drop the old ones rather than leave
-- undeletable duplicates behind.
DELETE FROM "Notification" WHERE "type" IN ('LINK_EXPIRING_SOON', 'LINK_EXPIRED');
