# Information Architecture — APAS

**Status:** v2 · updated 2026-08-04  
**Purpose:** the governing reference for how APAS is structured — what things are called, how they relate, where they live, and how anything new gets placed.

**Companion documents:** multi-tenancy-design.md · tenancy-implementation-plan.md · api-performance-backlog.md · DESIGN.md (visual system) · PRODUCT.md (positioning).

> **How to use this.** Before adding a screen, an entity, a nav item or a URL, check it against §2 (vocabulary), §5 (URL rules) and §10 (placement rules). If the thing you are building does not fit, change this document deliberately — do not route around it.

---

## 1. Zones

APAS has five distinct zones with different audiences, auth models and design languages. Keeping them separate is the top-level structural decision.

| Zone | Audience | Auth | Root |
|---|---|---|---|
| **Public** | Prospects, regulators, the curious | None | `/`, `/legal/*` |
| **Auth** | People getting in or out | Anonymous → identified | `/auth/*` |
| **Patient** | Patients answering questionnaires | Single-use token, no account | `/fill/[token]/*` |
| **Clinician app** | Practitioners and practice staff | Session + practice context | `/p/[slug]/…` |
| **Practice administration** | Owners and admins | Session + role gate | `/p/[slug]/team`, `/areas`, `/settings`, `/billing` |

The **Patient** zone is the one to guard most carefully. Patients are not users: they have no account, no navigation, no access to anything but the one questionnaire their token unlocks. It must never inherit the clinician shell, and its copy must name **the practice** as data controller — APAS is the platform only.

**Practice administration** lives inside the clinician app but is role-gated. It should read as organisation work, not clinical work — separate nav group, quieter chrome.

Entry states outside a practice:

| State | Route | Next step |
|---|---|---|
| Signed in, no membership | `/no-practice` | Create a practice or accept an invite |
| Create a practice | `/onboarding` | Owner membership + `PENDING_VERIFICATION` |
| Accept invite | `/invitations/[token]` | Join as invited role |

---

## 2. Canonical vocabulary

The single highest-value thing this document does. The same word must mean the same thing in the schema, the URLs and the UI.

### Terms we commit to

| Term | Means | Does **not** mean |
|---|---|---|
| **Practice** | The tenant. A clinic as a business. The security wall. | A branch of psychology |
| **Area** | A subdivision inside a practice (Cognitive, Forensic, …). A room, not a wall. | A tenant, a security boundary |
| **Practitioner** | A human who delivers care. Rendered as “clinician” in UI copy. | A user account |
| **Membership** | One person’s seat in one practice: role, areas, status. One **billing seat** when `ACTIVE`. | The person |
| **Patient** | A person receiving care, recorded within one practice | A user, a login |
| **Scale** | The *template* — items, options, thresholds. PHQ-9 itself. | A filled-in response set |
| **Questionnaire** | One *instance* of a Scale issued to a patient | The template |
| **Appointment** | A `ClinicalSession` whose `kind` is `APPOINTMENT` | An auth session; a DIRECT send |
| **Questionnaire send** | A `ClinicalSession` whose `kind` is `DIRECT` | An appointment |
| **Batch** | One issuance of the same questionnaire set to many patients | A group of patients |
| **Note** | Clinical writing attached to a patient, appointment or questionnaire | A system comment |
| **Care team** | Named clinicians on a patient inside one practice | Cross-practice sharing |
| **Referral** | Intra-practice handoff between areas | Cross-practice transfer |
| **Patient access ladder** | Practice policy: who may see which patients (`OPEN` / `AREA_SCOPED` / `ASSIGNED_ONLY`) | Per-user custom RBAC |

### Three collisions resolved

1. **“Session” is overloaded three ways** — the NextAuth `Session` (login), the `ClinicalSession` model, and the `/sessions/` URL segment.

   **Resolution:** `ClinicalSession` keeps its name. `SessionKind` has two values; a `DIRECT` row is not an appointment. In UI copy, say “appointment” only where `kind` is `APPOINTMENT`, and “questionnaire send” for `DIRECT`. Never use the bare word “session” in user-facing copy for either.

2. **“Scale” vs “Questionnaire”** — Template = Scale. Issued instance = Questionnaire. The sidebar’s “Scales” library is correct.

3. **“Practice”** — A practice is a business; a branch of psychology is an Area. See multi-tenancy-design.md.

Words users say that we deliberately do **not** adopt as system terms: *assessment* (ambiguous), *client* (use patient), *doctor* (many practitioners are not), *test* (clinically loaded).

---

## 3. Content model

The ownership tree. Read top to bottom as “contains / owns.”

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
│   ├── Questionnaire send (DIRECT — outside any appointment)
│   ├── Note
│   └── Referral  (area → area inside the practice)
├── Batch → ClinicalSession[]
├── PracticeInvitation
└── AuditEntry                    (actor, practice, subject, action, at)
```

Invariants:

- **Every owned record carries `practiceId`.** No exceptions. It is the wall.
- **Ownership and authorship are separate.** `practiceId` (who owns it) never changes; `authorId` / actor (who did it) survives departure.
- **Areas are rooms, not walls.** Sharing a patient is adding an area or a care-team member — not a consent grant between businesses.

Cross-cutting objects outside the tree: `User` (a human, spans practices), `Notification` (per user, usually scoped to a practice), and the global Scale library.

---

## 4. Navigation model

### Current (tenancy phases 0–8 shipped)

```
[ Practice switcher ]              ← top of sidebar, always visible

Clinical    → Dashboard · Patients · Batches · Referrals*
Library     → Scales
Practice    → Team · Areas · Settings · Billing        (role-gated)
Account     → Account                                  (profile · password · notifications)
```

\* Referrals appears only when the practice has at least one Area.

Plus a command palette (⌘K), global search, notification bell, and account menu in the header. Appointments remain nested under the patient for now.

### Still to promote

```
Clinical    → … · Appointments (top-level) · …
```

### Decisions embedded in the nav

- **The practice switcher sits at the top of the sidebar**, not in the account menu. It scopes everything below it.
- **Practice vs Account.** Practice settings (`/p/<slug>/settings`) are organisation and role-gated. Account (`/account`) is the human and follows them across practices. Legacy `/settings` redirects to `/account`.
- **Referrals appears only once Areas exist.** Do not ship an empty nav item.
- **Nav is filtered by role**, never rendered-then-disabled.

### Navigation depth rule

Maximum **three levels** in the sidebar. Anything deeper is a tab, a filter, or a detail page reached from a list — never a nav item.

---

## 5. URL architecture

### Practice in the path (shipped)

```
/p/[practiceSlug]/patients/[patientId]
```

Not implicit-from-session. Reasons: links are unambiguous across multi-practice membership; pasting a URL into Slack does not depend on the recipient’s active context; the back button behaves; a mismatch between URL and session is detectable.

Account, auth, public and patient zones stay unprefixed: `/account`, `/auth/*`, `/legal/*`, `/fill/[token]`, `/onboarding`, `/invitations/[token]`, `/no-practice`.

### Fix the depth problem (still open)

The deepest route today is still too deep:

```
/p/[slug]/patients/[id]/sessions/[sessionId]/questionnaires/[questionnaireId]/report
```

**Rule going forward:** every entity with a stable ID gets a canonical flat URL. Hierarchy expresses *context*, not *identity*.

```
canonical    /p/[slug]/questionnaires/[id]
             /p/[slug]/appointments/[id]
contextual   /p/[slug]/patients/[id]  → tabs: Overview · Appointments · Questionnaires · Notes · Details
```

### URL rules

1. Plural collection, singular resource: `/patients`, `/patients/[id]`.
2. Nouns, not verbs — except deliberate actions: `/new`, `/edit`.
3. No entity nested more than one level below its parent (target state).
4. Never expose a guessable ID in a patient-facing URL — `/fill/[token]` is correct.
5. `/p/[slug]/…` for everything tenant-owned; no prefix for account, auth, public, or patient zones.

### Housekeeping

`app/compare/{a,b,c}` are UI comparison prototypes in the production route tree. Move them behind a dev-only flag or delete them.

---

## 6. Screen inventory

Routes below are practice-prefixed where tenant-owned. Legacy unprefixed clinical URLs redirect via `/practice-redirect`.

| Screen | Route | Status | Notes |
|---|---|---|---|
| Landing | `/` | Live | Public |
| Legal (privacy, terms, retention) | `/legal/*` | Live | Practice named as controller; APAS as platform |
| Sign in / up / verify / reset | `/auth/*` | Live | |
| No practice | `/no-practice` | Live | Create practice or accept invite |
| Practice onboarding | `/onboarding` | Live | Self-serve → `PENDING_VERIFICATION` |
| Accept invitation | `/invitations/[token]` | Live | Existing-user path is one click |
| Dashboard | `/p/[slug]/dashboard` | Live | Caseload, alerts; verification banner when pending |
| Patients list / detail | `/p/[slug]/patients`, `…/[id]` | Live | Access ladder applied; Details tab for areas / care team |
| Appointment / send detail | nested under patient | Live | Promote later to `/appointments/[id]` |
| Questionnaire + report | nested under patient | Live | Promote later to canonical URL |
| Batches | `/p/[slug]/batches` | Live | |
| Scales library / builder | `/p/[slug]/scales` | Live | Ownership tiers (practice / library / personal) |
| Team | `/p/[slug]/team` | Live | Members, roles, invites, offboarding |
| Areas | `/p/[slug]/areas` | Live | CRUD + patient access ladder |
| Referrals | `/p/[slug]/referrals` | Live | Inbox + outbox; nav when areas exist |
| Practice settings | `/p/[slug]/settings` | Live | Profile, branding, activate, access ladder |
| Billing | `/p/[slug]/billing` | Live | Seats = ACTIVE memberships; checkout placeholder |
| Account | `/account` | Live | Profile, password, notifications |
| Patient fill | `/fill/[token]`, `…/complete` | Live | Practice branding; no clinician shell |
| Audit log | `/p/[slug]/audit` | Planned | Owner/Admin only |

---

## 7. Page anatomy

```
DashboardShell
└── AppSidebar          practice switcher · nav groups
└── DashboardHeader     breadcrumbs · search · notifications · account
    └── PageShell
        └── VerificationBanner   (when practice not ACTIVE)
        └── PageHeader           title · context · primary action (max one)
            └── SectionHeader…
                └── content | EmptyState
```

Rules:

- **One primary action per page**, top right. Everything else is secondary or lives in a row-level menu.
- **Every list has an authored empty state** — what this is, why it is empty, the one action that fixes it.
- **Breadcrumbs carry hierarchy** as URLs flatten. They are how a clinician knows which patient a questionnaire belongs to.
- **Severity is always rendered by the severity badge** from DESIGN.md. Never an ad-hoc coloured span.

---

## 8. Search, command palette, notifications

**Search** indexes patients (display name, anonymous ID), scales and batches within the **active practice**. It must stay hard-scoped to the practice in context.

**Command palette (⌘K)** is navigation + search, not a second app. Actions appear only when the role permits them. Account paths (`/account`) are not practice-prefixed.

**Notifications** are per user and usually per practice. Suicidal-ideation is the deliberate exception: it may surface across a user’s practices, clearly labelled with its practice. See multi-tenancy-design.md §9.

---

## 9. Permission surface

Navigation is filtered by role — never rendered-then-disabled.

Fixed roles only. No practice-defined custom RBAC. Practices tune **policy knobs** (access ladder, branding, verification) instead.

| Capability / surface | Owner | Admin | Clinician | Supervisor | Front desk |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | limited |
| Patients | ✓ | ✓ | ✓ | ✓ | ✓ (no notes/scores) |
| Notes | ✓ | — | ✓ | ✓ | **✗** |
| Scores / reports | ✓ | — | ✓ | ✓ | **✗** |
| Scales | ✓ | ✓ | ✓ | ✓ | — |
| Referrals | ✓ | ✓ | ✓ | ✓ | — |
| Team / Areas / Practice settings | ✓ | ✓ | — | — | — |
| Billing / Activate practice | ✓ | — | — | — | — |
| Audit log (planned) | ✓ | ✓ | — | — | — |

**Patient access ladder** (Owner/Admin always see the full caseload; everyone else follows the practice setting):

| Mode | Meaning |
|---|---|
| `OPEN` (default) | Any active member sees the practice caseload |
| `AREA_SCOPED` | Members see patients in their areas (and care-team assignments) |
| `ASSIGNED_ONLY` | Members see only patients where they are on the care team |

Front desk seeing scheduling but **not** clinical content remains the most important clinical boundary.

---

## 10. Placement rules

When adding something new, decide in this order:

1. **Does it belong to a practice?** If yes it carries `practiceId` and lives under `/p/[slug]/`. If it belongs to a human across practices, it is Account (`/account`).
2. **Is it a new noun, or a view of an existing one?** New nouns get a route and possibly a nav item. Views get a tab or a filter. Most things are views.
3. **Nav item, tab, or detail page?** Nav item only if a user goes there directly and often. Tab if it is one facet of a resource. Detail page if it is reached from a list.
4. **Which role sees it?** If the answer is “everyone,” check again — most new surfaces are role-specific.
5. **What is its empty state, and its name in §2?** If the name is not in the vocabulary table, add it there first.

---

## 11. Practice lifecycle

| Status | What staff can do |
|---|---|
| `PENDING_VERIFICATION` | Configure practice, areas, settings. Cannot create patients or invite staff. |
| `ACTIVE` | Full clinical and team operations. |
| `SUSPENDED` | Writes blocked; contact support path later. |

Activation (Owner): registration / licence number + contact email present → `POST /api/practice/activate`. Self-serve for v1; a human review queue can replace the activate step later without changing the status field.

Billing: **one seat = one ACTIVE membership**. A clinician in three practices costs three seats. Checkout is not wired yet.

---

## 12. Decisions log

| Decision | Outcome |
|---|---|
| Practice slug in URL | Shipped: `/p/[slug]/…` |
| `ClinicalSession` rename | Kept — covers APPOINTMENT and DIRECT |
| Role list | Owner / Admin / Clinician / Supervisor / Front desk — fixed, not custom |
| Default patient access | `OPEN` |
| Hide Areas for solo practices | No — show with empty state if `manageAreas` |
| Practice creation | Self-serve → `PENDING_VERIFICATION` → activate |
| Billing seat | ACTIVE memberships |
| Cross-practice patient sharing | **Not building** until a real customer needs it |

### Still open

- Promote Appointments and Questionnaires to canonical flat URLs.
- Fate of `app/compare/*`.
- Payment provider / checkout for seats.
- Audit log UI.
