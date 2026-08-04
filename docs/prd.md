# Product Requirements Document — APAS

---

| Field | Value |
|---|---|
| Product | APAS (Automated Psychological Assessment Scoring) · Clinical Overwatch |
| Document | Product Requirements Document |
| Version | 1.0 |
| Date | 4 August 2026 |
| Owner | Product |
| Audience | Engineering, design, clinical advisors, go-to-market |
| Classification | Confidential · Internal |

**Related documents:** PRODUCT.md (positioning), information-architecture.md, multi-tenancy-design.md, tenancy-implementation-plan.md, DESIGN.md (visual system).

---

## 1. Summary

APAS is a web application for mental-health practices. It turns psychology questionnaire responses into scores, severity classifications, and actionable alerts.

Clinicians send patients a secure, single-use link. Patients complete the instrument without creating an account. APAS scores responses instantly, tracks severity over time, and shows who needs attention now.

The product is practice-tenanted. A **practice** (clinic) is the unit of data custody, billing, and access. Staff join through memberships and fixed roles. **Areas** organise work inside a practice; they are not a second security wall.

**Primary outcome:** A clinician can answer “Who needs my attention right now?” in under ten seconds from the dashboard — faster and more reliably than paper scoring.

---

## 2. Problem

Licensed clinicians need reliable scoring and risk signal without becoming an IT department. Today, many practices still rely on paper or spreadsheets.

| Pain | Without APAS |
|---|---|
| Manual scoring is slow and error-prone | Paper or spreadsheet scoring between sessions |
| Severity trends are hard to see | Scattered PDFs or notes |
| Critical signals can be missed | No reliable path for suicidal ideation or threshold alerts |
| Solo tools break as clinics grow | One login maps to one caseload; no clear team or custody model |
| Patients should not need accounts | Portals and emailed forms add friction and risk |

APAS exists so clinicians get **decision support** — scores and alerts as input to judgment, never a substitute for it — inside a practice that can grow from solo to multi-clinician without leaking data across businesses.

---

## 3. Goals and non-goals

### 3.1 Goals

1. **Clinical signal first.** Severity and suicidal-ideation alerts are impossible to overlook. The dashboard answers “who needs me?” immediately.
2. **Zero-training clinician UX.** Standard affordances only. Usable between sessions on any device.
3. **Practice as the wall.** All clinical data belongs to a practice. Access is membership, role, and access ladder.
4. **Patient safety and privacy.** Patients are pseudonymous by default. Identity is collected only with consent. The practice is named as data controller. The fill flow has no clinician shell.
5. **Trust through exactness.** Real instrument names, exact scores, and timestamps. No wellness gamification.

### 3.2 Non-goals (current horizon)

- Cross-practice patient sharing or a linked person identity across businesses
- Practice-defined custom RBAC (roles are fixed; practices tune policy knobs)
- Native mobile apps (responsive web only)
- Positioning APAS as a medical device or diagnostic authority
- Live payment checkout (seat model is defined; billing UI is a placeholder)
- Consumer patient accounts or portals beyond the fill link

---

## 4. Users and personas

**Early market:** Solo and small practices. Domain experts, not IT departments.

| Persona | Needs | Primary surfaces |
|---|---|---|
| Owner | Create and activate the practice; billing seats; team; settings | Onboarding, Practice settings, Billing, Team |
| Admin | Organise team, areas, and access ladder; not clinical content | Team, Areas, Practice settings |
| Clinician | Caseload, send assessments, notes, scores, referrals | Dashboard, Patients, Scales, Batches |
| Supervisor | Clinical tools plus supervisee visibility as designed | Dashboard, Patients |
| Front desk | Scheduling and send logistics; no notes or scores | Patients (limited), batches |
| Patient | Complete one questionnaire securely; understand consent | Fill link only |

---

## 5. Product principles

1. **Severity outranks everything.** Clinical risk owns the loudest visual channel.
2. **Data density over decoration.** Prefer one more real number to empty polish.
3. **Practice is the wall; area is a room.** Never confuse organisation with tenancy.
4. **Navigation is filtered by role.** Never show-then-disable surfaces people cannot use.
5. **Accessibility is clinical safety.** A missed alert is a safety failure, not a UX nit.
6. **Decision support, not diagnosis.** Product and legal copy must never imply otherwise.

---

## 6. Core concepts

| Term | Definition |
|---|---|
| Practice | The tenant or clinic. Legal custodian, billing unit, and security boundary. |
| Membership | One person’s seat in one practice (role and status). ACTIVE equals one billable seat. |
| Area | A subdivision inside a practice (for example Cognitive). Organisational only. |
| Scale | Instrument template (PHQ-9, GAD-7, or custom). |
| Questionnaire | One issued instance of a scale to a patient. |
| Clinical session | An appointment or a direct questionnaire send (two kinds). |
| Patient access ladder | Practice policy: Open, Area-scoped, or Assigned-only. |
| Care team | Named clinicians on a patient inside one practice. |
| Referral | Intra-practice handoff between areas. |

Full vocabulary is maintained in information-architecture.md, section 2.

---

## 7. Current product scope

This section describes capabilities the product must continue to support. Tenancy phases 0 through 8 are implemented.

### 7.1 Auth and account

- Sign up, sign in, email verification, and password reset
- Account settings (profile, password, notifications) at /account — scoped to the human, not a practice
- Signed in with no practice lands on /no-practice, then create a practice or accept an invite

### 7.2 Practice lifecycle

| Status | Behaviour |
|---|---|
| Pending verification | Staff may configure the practice; they cannot create patients or invite staff |
| Active | Full clinical and team operations |
| Suspended | Writes are blocked |

Additional behaviour:

- Self-serve create at /onboarding creates an Owner membership in pending status
- Owner activates after registration or licence number and contact email are present
- Practice settings cover profile, branding tagline, and access ladder
- Billing seats equal ACTIVE memberships; checkout is not wired yet

### 7.3 Clinical workflow

- Dashboard with caseload, alerts, and status band; verification banner when pending
- Patients: create and detail (sessions, scores, notes, areas, care team)
- Questionnaire sends: appointments, direct sends, and batches
- Scales library and custom scale builder
- Notes and scores gated by role (Admin and Front desk excluded from clinical content)
- Notifications for severity and suicidal ideation

### 7.4 Patient fill

- Token URL under /fill/[token] — no account and no clinician chrome
- Consent first; optional identity collection only when enabled and consented
- Practice named as controller; APAS as platform; optional practice tagline

### 7.5 Team and organisation

- Team: invite, roles, offboarding; block offboarding if patients remain assigned
- Areas: create and manage; membership areas applied on invite accept
- Patient access ladder (Owner and Admin always see the full caseload)
- Care teams and referrals inbox or outbox (Referrals nav appears when areas exist)
- Practice switcher for multi-practice users; tenant URLs under /p/[slug]/…

### 7.6 Platform and security (must not regress)

- Every owned record carries a practice identifier
- Data access goes through a practice-scoped database accessor, with row-level security as defence in depth
- Tenancy seam checks run in CI
- Audit entries are written for practice-significant actions

---

## 8. Functional requirements

Priority legend:

- **P0** — Must for the current product
- **P1** — Next horizon
- **P2** — Later

### 8.1 Clinical overwatch (P0)

| ID | Requirement |
|---|---|
| C-1 | Score supported scales (library and practice or custom) when a questionnaire is submitted |
| C-2 | Persist severity and show it consistently with the severity badge |
| C-3 | Raise and display alerts for threshold crossings and suicidal ideation |
| C-4 | Dashboard shows who needs attention, with critical and open alert counts |
| C-5 | Longitudinal score history is visible on the patient record |
| C-6 | Patients receive secure single-use, expiring fill links |

### 8.2 Practice tenancy (P0)

| ID | Requirement |
|---|---|
| T-1 | Users act only inside an active membership’s practice context |
| T-2 | Tenant URLs include /p/[slug]/… and resolve membership correctly |
| T-3 | Cross-practice data access is denied by application scoping and RLS |
| T-4 | Roles are fixed: Owner, Admin, Clinician, Supervisor, Front desk |
| T-5 | Pending practices cannot create patients or invite staff |
| T-6 | Patient visibility respects Owner/Admin override and the access ladder |

### 8.3 Team and organisation (P0)

| ID | Requirement |
|---|---|
| O-1 | Owners and Admins invite by email with a role and optional areas |
| O-2 | Existing users accept invites in one click; new users can sign up then join |
| O-3 | Offboarding marks membership departed and blocks if patients remain assigned |
| O-4 | Areas and care teams support Area-scoped and Assigned-only modes |
| O-5 | Intra-practice referrals support accept and decline with correct side effects |

### 8.4 Trust, legal, and branding (P0)

| ID | Requirement |
|---|---|
| L-1 | Patients are pseudonymous by default |
| L-2 | Identity details require explicit consent on the fill flow |
| L-3 | Legal and consent copy name the practice as data controller |
| L-4 | The fill shell shows the practice name and optional tagline |

### 8.5 Near-term (P1)

| ID | Requirement |
|---|---|
| N-1 | Payment checkout for seats (provider to be decided) |
| N-2 | Optional human verification queue to replace or gate self-serve activate |
| N-3 | Canonical flat URLs for appointments and questionnaires |
| N-4 | Top-level Appointments navigation for “what is on today” |
| N-5 | Audit log UI for Owner and Admin |
| N-6 | Clearer multi-practice notification badges on the practice switcher |

### 8.6 Later (P2)

| ID | Requirement |
|---|---|
| F-1 | Cross-practice sharing with consent grants, only when a customer needs it |
| F-2 | Deeper supervisor workflows (co-sign, supervisee caseloads) |
| F-3 | Richer scale marketplace and verified library governance |
| F-4 | Reporting and export packs for practice admins |

---

## 9. User journeys

### 9.1 Solo clinician, day one

1. Sign up and verify email; land with no practice.
2. Create a practice on /onboarding.
3. Enter registration or licence number and contact email; activate.
4. Add a patient; send a PHQ-9 link; patient completes the fill flow.
5. Dashboard shows score and severity; open the patient for detail.

### 9.2 Invite a colleague

1. Owner or Admin opens Team and invites by email with role (and optional areas).
2. Colleague accepts (existing account or after sign-up).
3. Colleague works in the practice; caseload follows the access ladder.

### 9.3 Multi-area clinic

1. Admin creates areas and sets the access ladder if needed.
2. Patients are assigned areas or care-team members on the Details tab.
3. A clinician refers a patient to another area; the receiver accepts; area and care team update.

### 9.4 Patient fill

1. Patient opens the link, sees the practice name, and consents.
2. Optional details or intake appear only when enabled.
3. Patient completes questionnaire(s), sees thank-you, and has no further access.

---

## 10. Success metrics

| Metric | Intent | Initial target |
|---|---|---|
| Time to first scored assessment | Activation to value | Under 30 minutes for a guided new practice |
| Dashboard attention time | Core job | Under 10 seconds to identify priority patients |
| SI and critical alert visibility | Safety | Alerts visible on next session load; no silent drop |
| Invite accept rate | Team growth | Track and reduce friction |
| Fill completion rate | Patient experience | Track by scale; investigate drop-offs |
| Cross-tenant incidents | Trust | Zero tolerated |

**Qualitative success:** Clinicians trust scores enough to replace paper for routine instruments. Owners can explain who sees which patients.

---

## 11. Constraints and compliance

- **Not a medical device.** Decision support only. Clinical judgment remains with the practitioner.
- **Not an emergency service.** Crisis copy directs people to local emergency or crisis lines.
- **Data controller** is the practice. APAS is the platform in product and legal copy.
- **Accessibility.** Keyboard-complete critical flows, AA contrast, and alerts announced to assistive technology.
- **Security.** Practice-scoped data access, invitation tokens, expiring fill tokens, and an audit trail.

Legal pages under /legal/* must stay aligned with this posture.

---

## 12. UX and design requirements

- Auth may be brand-forward. After login, the product is task UI.
- Severity colours are reserved for clinical risk only.
- Every primary list has an authored empty state.
- One primary action per page.
- The patient zone never inherits clinician navigation.
- Visual tokens and the severity ramp are defined in DESIGN.md.

---

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Tenancy bug leaks data across practices | Scoped database access, RLS, leak tests, CI seam check |
| Alert fatigue or missed suicidal ideation | Dedicated notification types, severity hierarchy, carefully labelled SI exception |
| Verification too weak or too hard | Self-serve activate for v1; status field ready for human review |
| Deep nested URLs become brittle | Flatten appointments and questionnaires (P1) |
| Billing not wired | Seat definition is shipped; do not invent a second inventory |

---

## 14. Rollout posture

- Tenancy phases 0 through 8 are the multi-practice baseline.
- New features must not bypass the practice identifier or the scoped data accessor.
- Prefer progressive disclosure (for example, Referrals appears only when areas exist).
- Seed or demo practices may start Active for internal use. Real signups start Pending verification.

---

## 15. Open decisions

| Topic | Status |
|---|---|
| Payment provider and pricing | Open (seat unit decided) |
| Human verification versus self-serve activate | Self-serve now; queue optional later |
| Appointments top-level nav and flat URLs | Planned (P1) |
| Cross-practice sharing | Explicitly deferred |
| Fate of app/compare prototypes | Open |

---

## 16. Document control

| Version | Date | Notes |
|---|---|---|
| 1.0 | 4 August 2026 | Initial PRD reflecting shipped tenancy and clinical overwatch core |

When requirements change, update this PRD together with the information architecture and tenancy companions so vocabulary and routes do not drift.
