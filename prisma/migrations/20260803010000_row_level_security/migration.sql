-- Phase 4: row-level security as defence in depth.
--
-- These policies are DORMANT as shipped, and that is deliberate.
--
-- The application currently connects as `neondb_owner`, which carries the
-- BYPASSRLS role attribute. Postgres ignores every policy below for such a
-- role — FORCE ROW LEVEL SECURITY does not change that, because FORCE only
-- makes RLS apply to a table's *owner*, while BYPASSRLS is a role attribute
-- that outranks it. Nothing here alters current behaviour.
--
-- They activate by pointing DATABASE_URL at an unprivileged role. See
-- docs/tenancy-implementation-plan.md (Phase 4) for the activation runbook and
-- for why that is deferred: enforcement requires setting `app.practice_id` per
-- query, which costs a transaction (BEGIN + set_config + query + COMMIT), i.e.
-- three extra round trips on every query.
--
-- The predicate is deny-by-default. `current_setting('app.practice_id', true)`
-- returns NULL when the setting is absent, the comparison then yields NULL
-- rather than true, and the row is filtered out. A connection that forgets to
-- set the practice sees nothing at all — which is the correct failure mode.

-- Strict tenant tables: practiceId is NOT NULL, so the predicate is equality.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'Patient',
    'ClinicalSession',
    'SessionBatch',
    'Questionnaire',
    'Note',
    'Area',
    'Membership',
    'PracticeInvitation',
    'AuditEntry'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("practiceId" = current_setting(''app.practice_id'', true))
         WITH CHECK ("practiceId" = current_setting(''app.practice_id'', true))',
      t
    );
  END LOOP;
END
$$;

-- Scale: nullable practiceId. The global library and personal-tier scales carry
-- no practice and must stay readable, so NULL rows are permitted. Rows that DO
-- belong to a practice are confined to it.
ALTER TABLE "Scale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Scale" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Scale";
CREATE POLICY tenant_isolation ON "Scale"
  USING (
    "practiceId" IS NULL
    OR "practiceId" = current_setting('app.practice_id', true)
  )
  WITH CHECK (
    "practiceId" IS NULL
    OR "practiceId" = current_setting('app.practice_id', true)
  );

-- Notification: nullable practiceId. Account-level notifications (LOGIN) belong
-- to the human rather than any practice and must surface in every context.
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Notification";
CREATE POLICY tenant_isolation ON "Notification"
  USING (
    "practiceId" IS NULL
    OR "practiceId" = current_setting('app.practice_id', true)
  )
  WITH CHECK (
    "practiceId" IS NULL
    OR "practiceId" = current_setting('app.practice_id', true)
  );

-- The practice record itself: a scoped connection may only see its own.
ALTER TABLE "Practice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Practice" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Practice";
CREATE POLICY tenant_isolation ON "Practice"
  USING ("id" = current_setting('app.practice_id', true))
  WITH CHECK ("id" = current_setting('app.practice_id', true));

-- Deliberately NOT covered, and why:
--
--   User, Account, Session, VerificationToken   global; identity spans practices
--   NotificationPreference                      per user, not per practice
--   ScaleItem, ResponseOption, SeverityThreshold  children of Scale
--   QuestionnaireResponse                       child of Questionnaire
--   MembershipArea, PatientArea                 join rows, reached via parents
--
-- The child tables inherit protection in practice because they are only
-- reachable through a parent the policies above already constrain. Covering
-- them directly would need a join in the predicate, which Postgres evaluates
-- per row — a real cost for no additional guarantee at this stage.
