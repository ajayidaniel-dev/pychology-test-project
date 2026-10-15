-- Notification had no foreign keys, so deleting a patient (or a session, or a
-- questionnaire) left its notifications behind pointing at rows that no longer
-- exist. Clicking one lands on a 404. Clean up the existing strays, then add
-- the cascades so it cannot happen again.

-- 1. Drop notifications whose target is already gone ------------------------
DELETE FROM "Notification"
WHERE "patientId" IS NOT NULL
  AND "patientId" NOT IN (SELECT "id" FROM "Patient");

DELETE FROM "Notification"
WHERE "sessionId" IS NOT NULL
  AND "sessionId" NOT IN (SELECT "id" FROM "ClinicalSession");

DELETE FROM "Notification"
WHERE "questionnaireId" IS NOT NULL
  AND "questionnaireId" NOT IN (SELECT "id" FROM "Questionnaire");

-- 2. Enforce it from here on ------------------------------------------------
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ClinicalSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_questionnaireId_fkey"
    FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
