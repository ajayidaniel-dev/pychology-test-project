# Information Architecture — APAS

**Status:** v1 · drafted 2026-08-03
**Purpose:** the governing reference for how APAS is structured — what things are
called, how they relate, where they live, and how anything new gets placed.

Companion documents: [multi-tenancy-design.md](./multi-tenancy-design.md),
[api-performance-backlog.md](./api-performance-backlog.md),
[../DESIGN.md](../DESIGN.md) (visual system), [../PRODUCT.md](../PRODUCT.md) (positioning).

> **How to use this.** Before adding a screen, an entity, a nav item or a URL,
> check it against §2 (vocabulary), §5 (URL rules) and §10 (placement rules). If
> the thing you are building does not fit, that is a signal to change this
> document deliberately — not to route around it.

---

## 1. Zones

APAS has four distinct zones with different audiences, auth models and design
languages. Keeping them separate is the top-level structural decision.

| Zone | Audience | Auth | Root |
|---|---|---|---|
| **Public** | Prospects, regulators, the curious | None | `/`, `/legal/*` |
| **Auth** | People getting in or out | Anonymous → identified | `/auth/*` |
| **Patient** | Patients answering questionnaires | Single-use token, no account | `/fill/[token]/*` |
| **Clinician app** | Practitioners and practice staff | Session + practice context | `/dashboard`, `/patients`, … |

The **Patient** zone is the one to guard most carefully. Patients are not users:
they have no account, no navigation, no access to anything but the one
questionnaire their token unlocks. It must never inherit the clinician shell,
and its copy must name **the practice** as data controller — not APAS.

A fifth zone arrives with tenancy: **Practice administration** (members, areas,
billing, verification). It lives inside the clinician app but is role-gated, and
should read as a distinctly different place — see §6.

---

## 2. Canonical vocabulary

The single highest-value thing this document does. Today the same word means
different things in the schema, the URLs and the UI, and that ambiguity is
already costing us.

### Terms we commit to

| Term | Means | Does **not** mean |
|---|---|---|
| **Practice** | The tenant. A clinic as a business. | A branch of psychology |
| **Area** | A subdivision inside a practice (Cognitive, Forensic, …) | A tenant, a security boundary |
| **Practitioner** | A human who delivers care. Rendered as "clinician" in UI copy. | A user account |
| **Membership** | One practitioner's seat in one practice: role, areas, status | The person |
| **Patient** | A person receiving care, recorded within one practice | A user, a login |
| **Scale** | The *template* — items, options, thresholds. PHQ-9 itself. | A filled-in response set |
| **Questionnaire** | One *instance* of a Scale issued to a patient | The template |
| **Appointment** | A `ClinicalSession` whose `kind` is `APPOINTMENT` | An auth session; a DIRECT send |
| **Questionnaire send** | A `ClinicalSession` whose `kind` is `DIRECT` — questionnaires with no appointment | An appointment |
| **Batch** | One issuance of the same questionnaire set to many patients | A group of patients |
| **Note** | Clinical writing attached to a patient, appointment or questionnaire | A system comment |

### Three collisions to fix

1. **"Session" is overloaded three ways** — the NextAuth `Session` (login), the
   `ClinicalSession` model, and the `/sessions/` URL segment.

   **Resolution (revised 2026-08-03): `ClinicalSession` keeps its name.** An
   earlier draft of this document proposed renaming it to `Appointment`. That
   was wrong: `SessionKind` has two values, and a `DIRECT` row is explicitly
   *not* an appointment — it is questionnaires sent with no appointment behind
   them. `Appointment` would be a false name for half the table.

   So: **`ClinicalSession` is the model name** and already covers both kinds.
   In UI copy, say "appointment" only where `kind` is `APPOINTMENT`, and
   "questionnaire send" for `DIRECT` — which is what the existing UI does.
   Never use the bare word "session" in user-facing copy for either, because
   that is the word that collides with login.

2. **"Scale" vs "Questionnaire"** is correct in the schema and inconsistent in
   the UI, where both appear for both meanings. Template = Scale. Issued
   instance = Questionnaire. The sidebar's "Scales" library is right.

3. **"Practice"** — see [multi-tenancy-design.md §0](./multi-tenancy-design.md).
   A practice is a business; a branch of psychology is an Area.

Words users say that we deliberately do **not** adopt as system terms:
*assessment* (ambiguous between scale and questionnaire), *client* (use
patient), *doctor* (many practitioners are not), *test* (clinically loaded).

---

## 3. Content model

The ownership tree. Read top to bottom as "contains / owns."

```
Practice  ← the tenant; owns everything below
├── Membership → User            (role, areas, status)
├── Area                          (Cognitive, Forensic, …)
├── Scale (practice-owned)        + global library, + personal tier
├── Patient                       (anonymousId unique per practice)
│   ├── care team → Membership
│   ├── Appointment  [ClinicalSession]
│   │   ├── Questionnaire → Scale
│   │   │   ├── Response → ScaleItem
│   │   │   ├── Score + Severity
│   │   │   └── Note
│   │   └── Note
│   ├── Questionnaire (standalone — outside any appointment)
│   ├── Note
│   └── Referral  (area → area, later practice → practice)
├── Batch → Appointment[]
└── AuditEntry                    (actor, practice, subject, action, at)
```

Two invariants that govern everything:

- **Every owned record carries `practiceId`.** No exceptions. It is the wall.
- **Ownership and authorship are separate columns.** `practiceId` (who owns it,
  never changes) and `authorId` (who did it, never changes, survives departure).

Cross-cutting objects that do not belong to the tree: `User` (a human, spans
practices), `Notification` (per user, scoped to a practice), and the global
Scale library.

---

## 4. Navigation model

### Today

```
Clinical    → Dashboard · Patients · Batches
Library     → Scales
Account     → Settings
```

Plus a command palette (⌘K), global search, notification bell, and account menu
in the header.

### Target with tenancy

```
[ Practice switcher ]              ← top of sidebar, always visible

Clinical    → Dashboard · Patients · Appointments · Batches · Referrals
Library     → Scales
Practice    → Team · Areas · Settings · Billing        (role-gated)
Account     → Profile · Notifications · Security
```

Four decisions embedded there:

- **The practice switcher sits at the top of the sidebar, not in the account
  menu.** It scopes everything below it, so it must sit above everything it
  scopes. Putting it in the avatar menu — a common shortcut — buries the single
  most consequential piece of state in the app.
- **"Practice" and "Account" split.** Practice settings are about the
  organisation and are role-gated; Account settings are about the human and
  follow them across practices. Today's single `/settings` conflates them and
  must be divided.
- **Appointments gets its own top-level entry.** It is currently reachable only
  by drilling through a patient, which makes "what is on today" unnecessarily
  hard — the single most common question a practice asks.
- **Referrals appears only once Areas exist.** Do not ship an empty nav item.

### Navigation depth rule

Maximum **three levels** in the sidebar. Anything deeper is a tab, a filter, or
a detail page reached from a list — never a nav item.

---

## 5. URL architecture

### The tenancy decision: put the practice in the path

```
/p/[practiceSlug]/patients/[patientId]
```

Not implicit-from-session. Reasons: links are unambiguous when someone belongs
to several practices; pasting a URL into Slack does not depend on the
recipient's active context; the back button and browser history behave; and a
mismatch between URL and session is *detectable* — the app can say "this record
belongs to Renaissance, switch?" instead of silently 404ing or, worse, silently
showing the wrong thing.

Cost: every internal link gains a prefix. Worth it.

### Fix the depth problem

The deepest route today is six levels:

```
/patients/[id]/sessions/[sessionId]/questionnaires/[questionnaireId]/report
```

That is an IA smell. It makes links fragile, breadcrumbs long, and the same
resource addressable only through one ancestry.

**Rule: every entity with a stable ID gets a canonical flat URL.** Hierarchy
expresses *context*, not *identity*.

```
canonical    /p/[slug]/questionnaires/[id]
             /p/[slug]/appointments/[id]
contextual   /p/[slug]/patients/[id]  → tabs: Overview · Appointments · Questionnaires · Notes · Referrals
```

Context comes from breadcrumbs and the patient header, not from the path.
Deep-nested routes may remain as redirects to canonical URLs.

### URL rules going forward

1. Plural collection, singular resource: `/patients`, `/patients/[id]`.
2. Nouns, not verbs — except deliberate actions: `/new`, `/edit`.
3. No entity nested more than one level below its parent.
4. Never expose a numeric or guessable ID in a patient-facing URL — the `/fill/[token]` pattern is correct and should not be diluted.
5. `/p/[slug]/…` for everything tenant-owned; no prefix for account, auth, public, or patient zones.

### Housekeeping

`app/compare/{a,b,c}` are UI comparison prototypes sitting in the production
route tree. Move them behind a dev-only flag or delete them — anything reachable
in production is part of the IA whether intended or not.

---

## 6. Screen inventory

| Screen | Route | Status | Notes |
|---|---|---|---|
| Landing | `/` | Live | Public |
| Legal (privacy, terms, retention) | `/legal/*` | Draft | Must name the practice as controller |
| Sign in / up / verify / reset | `/auth/*` | Live | Add "accept invitation" |
| Dashboard | `/dashboard` | Live | Caseload, alerts, status band |
| Patients list / detail | `/patients`, `/patients/[id]` | Live | Detail becomes tabbed |
| Appointment detail | nested today | Live | Promote to canonical `/appointments/[id]` |
| Questionnaire + report | nested today | Live | Promote to canonical |
| Batches | `/batches`, `/batches/new`, `/batches/[id]` | Live | |
| Scales library / builder | `/scales`, `/scales/new`, `/scales/[id]` | Live | Add ownership tier |
| Settings | `/settings` | Live | **Split** into Practice / Account |
| Patient fill | `/fill/[token]`, `/fill/[token]/complete` | Live | No shell, no nav |
| — | — | — | — |
| Practice onboarding | `/onboarding/*` | Planned | Create practice, areas, verification |
| Accept invitation | `/invitations/[token]` | Planned | Existing-user path is one click |
| Team | `/p/[slug]/team` | Planned | Members, roles, invites, offboarding |
| Areas | `/p/[slug]/areas` | Planned | |
| Referrals | `/p/[slug]/referrals` | Planned | Inbox + outbox |
| Practice settings / billing | `/p/[slug]/settings`, `/billing` | Planned | Owner/Admin only |
| Audit log | `/p/[slug]/audit` | Planned | Owner/Admin only |

---

## 7. Page anatomy

The shell components already encode a convention; treat it as the standard.

```
DashboardShell
└── AppSidebar          practice switcher · nav groups
└── DashboardHeader     breadcrumbs · search · notifications · account
    └── PageShell
        └── PageHeader      title · context · primary action (max one)
            └── SectionHeader…
                └── content | EmptyState
```

Rules:

- **One primary action per page**, top right. Everything else is secondary or
  lives in a row-level menu.
- **Every list has an authored empty state** — what this is, why it is empty,
  the one action that fixes it. `EmptyState` exists; use it rather than
  rendering a bare table with no rows.
- **Breadcrumbs carry hierarchy** now that URLs are flat. They are how a
  clinician knows which patient a questionnaire belongs to.
- **Severity is always rendered by the severity badge** from
  [../DESIGN.md](../DESIGN.md). Never an ad-hoc coloured span — clinical signal
  must look identical everywhere it appears.

---

## 8. Search, command palette, notifications

**Search** indexes: patients (display name, anonymous ID), appointments, scales,
batches, notes. It is **hard-scoped to the active practice** — this is the
highest-risk surface in the tenancy migration and must be fixed before practices
ship.

**Command palette (⌘K)** is navigation + search, not a second app. Actions
appear only when the role permits them.

**Notifications** are per user *and* per practice. A practitioner in several
practices sees a per-practice badge, and the switcher indicates where attention
is needed. The suicidal-ideation alert is the one deliberate exception: it
surfaces regardless of active context, clearly labelled with its practice. See
[multi-tenancy-design.md §9](./multi-tenancy-design.md).

---

## 9. Permission surface

Navigation is filtered by role — never rendered-then-disabled, which leaks the
existence of things people cannot access.

| | Owner | Admin | Clinician | Supervisor | Front desk |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | limited |
| Patients | ✓ | ✓ | ✓ | ✓ | ✓ (no notes/scores) |
| Appointments | ✓ | ✓ | ✓ | ✓ | ✓ schedule |
| Notes | ✓ | — | own + team | + supervisees, co-sign | **✗** |
| Scores / reports | ✓ | — | ✓ | ✓ | **✗** |
| Scales | ✓ | ✓ | ✓ | ✓ | view |
| Team / Areas | ✓ | ✓ | — | — | — |
| Billing | ✓ | — | — | — | — |
| Audit log | ✓ | ✓ | — | — | — |

Front desk seeing scheduling but **not** clinical content is the single most
important row here.

---

## 10. Placement rules

When adding something new, decide in this order:

1. **Does it belong to a practice?** If yes it carries `practiceId` and lives
   under `/p/[slug]/`. If it belongs to a human across practices, it is Account.
2. **Is it a new noun, or a view of an existing one?** New nouns get a route and
   possibly a nav item. Views get a tab or a filter. Most things are views.
3. **Nav item, tab, or detail page?** Nav item only if a user goes there
   directly and often. Tab if it is one facet of a resource. Detail page if it
   is reached from a list.
4. **Which role sees it?** If the answer is "everyone," check again — most new
   surfaces are role-specific.
5. **What is its empty state, and its name in §2?** If the name is not in the
   vocabulary table, add it there first.

---

## 11. Open decisions

- Practice slug in path (`/p/[slug]/…`) — recommended above, needs sign-off
  before links are written, because retrofitting it touches every internal link.
- Whether Areas are hidden entirely for single-clinician practices.
- ~~Whether `ClinicalSession` gets renamed~~ — resolved 2026-08-03: it keeps its
  name. See the vocabulary section.
- Default patient access ladder — recommended **Open** for small practices.
- Fate of `app/compare/*`.
