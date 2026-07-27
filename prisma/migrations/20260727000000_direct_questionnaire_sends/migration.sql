-- Direct sends: questionnaires issued to a patient with no appointment behind
-- them.
--
-- A direct send reuses ClinicalSession rather than getting its own table. The
-- fill token, consent capture, scoring and notification deep links are all
-- session-shaped already; splitting the record would fork every one of them.
-- `kind` is the discriminator, and it only decides what the clinician sees:
-- appointments in the sessions list, direct sends in their own section.
--
-- Everything that exists today was booked as an appointment, so the default
-- backfills the column correctly.

CREATE TYPE "SessionKind" AS ENUM ('APPOINTMENT', 'DIRECT');

ALTER TABLE "ClinicalSession"
    ADD COLUMN "kind" "SessionKind" NOT NULL DEFAULT 'APPOINTMENT';

ALTER TABLE "SessionBatch"
    ADD COLUMN "kind" "SessionKind" NOT NULL DEFAULT 'APPOINTMENT';

-- The patient page now reads sessions and direct sends as two separate lists.
CREATE INDEX "ClinicalSession_patientId_kind_idx"
    ON "ClinicalSession"("patientId", "kind");
