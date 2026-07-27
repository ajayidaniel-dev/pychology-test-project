# Questionnaires outside a session

**Date:** 27 July 2026
**Branch:** `feature/ui-improvement`

Clinicians could only get a questionnaire to a patient by booking a session
first. Sometimes there is no appointment — a re-screen between visits, a
follow-up measure — and the session was ceremony around the thing they actually
wanted: a link.

---

## The modelling decision

A direct send is a `ClinicalSession` with `kind: DIRECT`, not a new table.

Everything a send needs already hangs off `ClinicalSession`: the fill token and
its expiry, consent capture, `collectDetails`, the questionnaires themselves,
the scoring path in `/api/fill/[token]`, notification deep links, and the
`/patients/[id]/sessions/[sessionId]` URL space. Making `Questionnaire.sessionId`
nullable and giving questionnaires their own token would have forked all of it —
two fill flows, two notification href shapes, two review URLs — for a
distinction that is, in the end, about what the clinician sees.

So `kind` is a display discriminator with two consequences in the data:

- A direct send has no clinician-authored **title**. It is named after its
  scales (`directSendTitle`): `"PHQ-9"`, `"PHQ-9, GAD-7"`, `"PHQ-9, GAD-7,
  BDI-II +2 more"`.
- It has no appointment **date**. `scheduledAt` is the moment it was sent, and
  the UI labels it "Sent".

`SessionBatch.kind` mirrors it, so a batch is either appointments or sends and
never a mix — the sessions it creates all carry the batch's kind.

## Where it surfaces

| Surface | Behaviour |
|---------|-----------|
| Patient page | "Send questionnaire" button; a separate **Sent questionnaires** section below Sessions. The sessions table now shows appointments only |
| Send dialog | Pick scales → the link comes back **in the dialog**. It does not close on success: there is no mail provider, so the link is the deliverable |
| Send detail | Reuses the session page. Header reads "Sent <date>", status is the rolled-up send status, actions say "send" not "session" |
| Batches | `/batches/new` gained a kind toggle; `/batches/new?kind=direct` opens on it. Direct batches drop the title and date fields entirely |
| Batches list | "Send questionnaires" entry point, `Direct` badge on direct batches |
| Notifications | Link-expiry alerts say "Questionnaire link expired" rather than "Session link expired" for direct sends |

Score history, alerts, the AI patient summary and the dashboard caseload all
read questionnaires rather than sessions, so direct sends flow into them with no
change.

## Status, rolled up

`sendStatus()` collapses a send into one of `pending | completed | expired |
cancelled`, in that precedence order. Two judgement calls worth naming:

- A send whose questionnaires are all answered is **completed** even if the
  token has since lapsed. The link expiring after the work was done is not a
  failure and must not be flagged as one.
- A send with no questionnaires left is **not** completed. "Every one of zero is
  answered" is technically true and clinically meaningless.

## API

```
POST /api/patients/[id]/questionnaire-sends
     { scaleIds: string[], note?: string, collectDetails?: boolean }
  →  201 { ...session, fillUrl }

POST /api/batches
     { kind?: 'APPOINTMENT' | 'DIRECT', ... }
     title and scheduledAt are required for APPOINTMENT, derived for DIRECT

GET  /api/patients/[id]/sessions?kind=APPOINTMENT|DIRECT
```

Both create paths verify scale ownership before writing and de-duplicate
`scaleIds`, so a caller cannot attach another clinician's private scale or hand
one patient the same questionnaire twice.

## Incidental cleanups

- `BatchScalePicker` → `ScaleMultiPicker` in `components/scales/`, now shared by
  the batch form and the send dialog.
- `batch-sessions-table.tsx` had its own copy of the pending/completed/expired
  badge; both now use `SendStatusBadge`.
- `SectionHeader` gained an optional `description`.

## Migration

`20260727000000_direct_questionnaire_sends` — additive: creates the
`SessionKind` enum, adds `kind` to `ClinicalSession` and `SessionBatch`
defaulting to `APPOINTMENT` (so every existing row backfills correctly), and
indexes `(patientId, kind)` for the split patient page. Not yet applied to the
Neon database.

## Tests

`__tests__/lib/direct-sends.test.ts` — 11 tests covering title derivation
(ordering, the `+n more` tail, the empty case) and every status precedence rule
above. Suite: 73 passing across 11 files.

## Known gaps

- **Still no email delivery.** The link is copied by hand, same as sessions and
  batches.
- **Renewing a direct send's link** works through the same actions menu, but the
  72-hour TTL is not configurable per send.
- **Notes** filed against a direct send are labelled `Sent · PHQ-9` in the
  composer; the "attached to" chip on an existing note still shows the bare
  title, because the notes API does not select `kind`.
