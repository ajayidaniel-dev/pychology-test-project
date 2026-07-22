-- Batch sends: one authoring action fanned out across several patients.
--
-- A batch does NOT own a fill token. Each patient still gets their own
-- ClinicalSession with its own token, because the token grants access to one
-- patient's questionnaires. The batch only records that those sessions were
-- created together, so completion can be tracked as a group.

CREATE TABLE "SessionBatch" (
    "id" TEXT NOT NULL,
    "psychologistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionBatch_psychologistId_createdAt_idx"
    ON "SessionBatch"("psychologistId", "createdAt");

ALTER TABLE "SessionBatch"
    ADD CONSTRAINT "SessionBatch_psychologistId_fkey"
    FOREIGN KEY ("psychologistId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Nullable: every existing session, and every session from the single-patient
-- flow, simply has no batch.
ALTER TABLE "ClinicalSession" ADD COLUMN "batchId" TEXT;

CREATE INDEX "ClinicalSession_batchId_idx" ON "ClinicalSession"("batchId");

-- SET NULL, deliberately not CASCADE: deleting a batch dissolves the grouping,
-- it must never delete the sessions, responses, or notes it produced.
ALTER TABLE "ClinicalSession"
    ADD CONSTRAINT "ClinicalSession_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "SessionBatch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
