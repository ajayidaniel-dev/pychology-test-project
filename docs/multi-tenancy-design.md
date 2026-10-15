# Multi-Tenancy Design — Practices, Areas, Memberships

**Status:** design agreed, not implemented · drafted 2026-08-03
**Scope:** how APAS moves from one-psychologist-per-tenant to practices as tenants.

Companion documents: [information-architecture.md](./information-architecture.md),
[api-performance-backlog.md](./api-performance-backlog.md).

---

## 0. The terminology correction this design rests on

The eight things often listed as "practices" — Abnormal, Biopsychology, Social,
Cognitive, Developmental, Personality, Forensic, Industrial-Organizational — are
**branches of psychology**. They are disciplines, not businesses.

A **practice** is a business entity: a clinic with a name, a licence, an owner,
staff, patients, and legal custody of records.

Making a branch the tenant would produce eight tenants globally, with every
clinic in the country inside the same data boundary. Isolation collapses.

So:

- **Practice = the tenant.** Unit of isolation, billing, and legal custody.
- **Specialty / Area = a dimension.** Something a practice offers and a
  practitioner is credentialled in. Used for organisation, filtering and
  referral routing — **never** as a security boundary.

---

## 1. Core objects

| Object | What it is |
|---|---|
| **Practice** | The tenant. Owns all clinical data. Billed. Legal custodian. |
| **Area** | A subdivision inside a practice (Cognitive, Forensic, …). Organisational only. |
| **Membership** | A person's seat in a practice: role, areas, licence, status. One human may hold several. |
| **Practice context** | The active "which hat am I wearing" state on every request. |

**The rule to repeat to the team: the practice is the wall, the area is a room.**
Data never crosses the wall without an explicit, consented, logged grant. Moving
between rooms is a permission setting. Confusing the two is how leaks get built.

---

## 2. Tenancy strategy

**Shared tables, `practiceId` column on every owned record.** Not
database-per-tenant, not schema-per-tenant — those make migrations and
cross-practice features painful for a benefit we can get another way.

Two things make shared tables safe, both non-negotiable:

1. **One chokepoint.** All data access goes through a scoped accessor that
   cannot be constructed without a practice context. No raw Prisma client calls
   in route handlers. If a developer *can* forget the tenant filter, eventually
   one will.
2. **Postgres row-level security.** Defence in depth. The database refuses
   cross-tenant reads even when application code has a bug.

Plus an **audit log** from day one — actor, practice, subject, action, timestamp.
Not optional in healthcare, and it is specifically what makes any future
cross-practice sharing defensible.

### Ownership splits in two

Every record that today has `psychologistId` gains a second concept:

- `practiceId` — **who owns it.** Legal custody, access boundary. Never changes.
- `authorId` / `clinicianId` — **who did it.** Clinical responsibility. Never
  changes either, including after that person leaves.

Today these are one column. Separating them is the heart of the migration.

---

## 3. Signup — practice creation

A new signup creates two things: a personal account, and a practice.

1. **Account first.** Email, password, verification. Independent of any practice —
   it must be, because the same human may later join others.
2. **Create a practice, or join one.** If the clinic already exists on APAS
   (detectable by email domain), point them at their admin rather than letting
   them create a duplicate.
3. **Practice details.** Name, slug, address, registration/licence number,
   contact. The creator becomes **Owner**.
4. **Areas.** Chosen from the psychology branches plus free text. Default to one
   general area if skipped — never force this at signup, most people do not yet
   know their structure.
5. **Verification gate.** The practice starts `pending_verification`: it can
   explore, configure and build scales, but **cannot create patients or invite
   staff** until licence details clear. One status field; the cheapest possible
   defence against fake clinics holding real clinical data.
6. **Billing** once verified.

The Owner lands in an empty practice with a checklist: invite the team, set up
areas, add the first patient.

---

## 4. Practitioner onboarding

An Owner or Admin invites by email, choosing role and areas up front. The flow
splits on whether that email already has an APAS account:

- **New person** → create account → accept invite → membership created.
- **Existing person** → notified inside the app they already use; accept or
  decline in one click. **No second signup.**

That second path is what makes multi-practice real, and it is the one usually
built badly. If an existing clinician must create a new account to join a second
practice, we end up with two user records for one human and no way to switch.

On acceptance, capture what is practice-specific: licence number as registered
with *this* practice, areas, role, and supervisor if they are a trainee.

### Roles

Roles live on the **membership**, not the user. The same person can be Owner at
their own clinic and Clinician at a teaching hospital. Start with five and
resist adding more:

| Role | Can do |
|---|---|
| **Owner** | Everything, including billing and deleting the practice |
| **Admin** | Manage members, areas, settings — not billing |
| **Clinician** | Own patients, run sessions, write notes |
| **Supervisor** | A Clinician who can also view and co-sign supervisees' work |
| **Front desk** | Schedule sessions, send questionnaires — **cannot read notes or scores** |

Front desk is clinically important and easy to forget.

---

## 5. Practice context and the switcher

Once a person can belong to more than one practice, every screen is ambiguous
until "which practice am I in" is resolved.

Make it **explicit and persistent**: active practice stored in the session,
shown permanently in the app shell, switching is a deliberate act that reloads
context. Not a filter dropdown buried in settings.

Everything downstream reads from it — patient lists, dashboards, search,
notifications, alerts, scales. A clinician in three practices should feel like
they are using three separate apps that share a login. Any place Practice B's
data appears in Practice A's view is a bug of the most serious kind.

**Immediate consequence:** global search must be practice-scoped before
practices ship, or it becomes the leak.

---

## 6. Patients and areas

A patient is created **inside a practice**, by a clinician, assigned to one or
more **areas**, with a **responsible clinician**.

Access within the practice follows a ladder — one is the default, practices may
change it in settings:

- **Open** — any clinical role sees any patient. Right for small clinics, which
  is most early customers. *Recommended default.*
- **Area-scoped** — you see patients in areas you belong to. Right for larger
  multi-disciplinary practices.
- **Assigned-only** — your own patients plus what is shared with you.

Sharing a patient across areas is then simply adding an area, or adding a named
clinician to the care team. No consent flow, no expiry, no grant object — it is
a permission change inside a single legal custodian. Log it and move on.

**`anonymousId` becomes unique per practice**, not per psychologist. A globally
unique anonymous ID would be a correlation key across tenants — precisely what
pseudonymisation exists to prevent.

---

## 7. Sessions, questionnaires, notes, scales

**Questionnaire links** go out under the practice's name and branding. The
patient-facing consent copy must name **the practice** as data controller, not
APAS. The `/legal/*` drafts need rewriting for this.

**Note visibility**, three levels:

- private to author (drafts, personal impressions)
- care team (default)
- practice-wide

Plus **supervision**: a trainee's note sits in `pending_cosign` until their
supervisor signs. This is a real regulatory requirement in psychology, and
retrofitting it into the note lifecycle later is genuinely painful. Build the
states now even if the UI ships later.

**Scale ownership**, three tiers:

- **global library** — ours, available to everyone
- **practice-owned** — built by staff, stays with the practice *(default)*
- **personal** — travels with the clinician

Decide the default now. The first time a clinician leaves and wants their custom
instrument, it should not be an improvised support decision.

---

## 8. Referral between areas

Internal only for now. A workflow object, not a data-sharing grant:

**drafted → sent → accepted / declined → in progress → completed**

Carries a reason, source area, target area (or named clinician), and priority.
On acceptance the target area is added to the patient and the receiving
clinician joins the care team. On completion a summary returns to the referrer.

The value is the **workflow** — a visible queue, clear status, nobody dropped —
not access control. The same object later grows a consent gate and a scoped
payload for genuine cross-practice referral. Design the states with that future
in mind; do not build the machinery yet.

---

## 9. Notifications and alerts

Practice-scoped. A clinician in three practices sees a badge per practice, and
the switcher shows where attention is needed.

**One deliberate exception: the suicidal-ideation flag.** It routes to the
responsible clinician, their supervisor, and any practice-level clinical safety
contact — within the owning practice. It is **never suppressed** because the
person's active context is a different practice. If they are logged in at all,
it surfaces, clearly labelled with which practice it came from. This is the one
place we knowingly break clean scoping, and it is worth breaking.

---

## 10. Leaving a practice

Membership moves to `departed`. **Never deleted.**

- Access ends immediately; active sessions re-evaluated on next request.
- Notes and sessions stay with the practice — they were always its records.
- Authorship attribution persists forever. Deleting the membership row puts
  holes in the audit trail exactly where they would matter most.
- Their patients need reassignment — block or warn on offboarding if any patient
  would be left without a responsible clinician.
- Personal-tier scales travel with them; practice-tier ones do not.

---

## 11. Migration sequence

Order matters. Each step is invisible to users until the last two.

1. Add `Practice`, `Area`, `Membership`. Every existing psychologist becomes a
   solo practice with one general area, themselves as Owner.
2. Backfill `practiceId` across every table from the existing `psychologistId`.
   **Behaviour is identical here** — nothing changes for anyone.
3. Route every read through the scoped accessor; enable row-level security.
   Still no visible change, but the wall is now real and enforced in two places.
4. Fix indexes as tenant-leading composites — see
   [api-performance-backlog.md](./api-performance-backlog.md). Do it here, not later.
5. Ship the practice switcher, invitations, multi-membership.
6. Ship areas, care teams, internal referrals.

Steps 1–4 are the risky invisible part; 5–6 are the visible product. Do not
reorder — building the UI before the boundary is enforced is how boundaries end
up half-enforced.

---

## 12. Deliberately deferred

Cross-practice patient sharing, the linked cross-practice `Person` identity,
consent grants with scope/expiry/revocation, and the snapshot-vs-live-access
disclosure distinction.

All of it waits until a real customer needs a patient to move between two
separate businesses. Nothing above blocks it — referrals and note visibility
both grow into it — but building it now is weeks of compliance-shaped work for a
use case we do not have.

---

## 13. Open decisions

- Practice creation self-serve vs sales-verified (the `pending_verification`
  gate assumes self-serve with a hold).
- Billing: seats = active memberships, so a clinician in three practices costs
  three seats. Commercial call, needs stating out loud.
- Default patient access ladder — recommended **Open**, needs confirming.
- Whether `Area` is exposed to small practices at all, or hidden until a
  practice has more than N clinicians.
