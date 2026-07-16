# Landing Page, Legal Policies & Patient Data Collection — Plan

**Product:** APAS (Clinical Overwatch)  
**Date:** July 16, 2026  
**Status:** In progress (landing + legal pages drafted; data-collection feature not built yet)

This plan covers the next product slice: a public landing page, privacy / retention / terms documents, and consent-based collection of patient identity details.

---

## Goal

Give APAS a public front door and clear legal footing, then ship the product behavior those policies describe: patients stay anonymous by default; identifying details are collected only with explicit patient consent, when the clinician enables it for a link.

---

## 1. Landing page

**Task:** Create a public marketing landing page at `/` for unauthenticated visitors.

**Description:**
- Replace the current root redirect-to-signin (or equivalent) with a branded landing page.
- Signed-in users still go straight to `/dashboard`.
- Hero should lead with the APAS brand, one headline, one short supporting sentence, and CTAs (Sign up / Log in).
- Explain core value: instant scoring, longitudinal trends, clinical alerts, consent-first privacy.
- Include a short “How it works” sequence (create patient → send link → score on submit → act on alerts).
- Footer links to Privacy, Terms, and Data retention.
- Visual language should match the auth panel (navy hero, clinical tone) — not a generic marketing template.

**Key files:**
- `app/page.tsx`
- `components/landing/landing-page.tsx`
- `app/globals.css` (landing-specific motion / tokens if needed)

**Acceptance:**
- Unauthenticated visit to `/` shows the landing page.
- Authenticated visit redirects to `/dashboard`.
- CTAs reach `/auth/signup` and `/auth/signin`.
- Legal links reach `/legal/privacy`, `/legal/terms`, `/legal/retention`.
- Works on mobile and desktop.

---

## 2. Privacy policy

**Task:** Publish a public Privacy policy page.

**Description:**
- Create `/legal/privacy` with a shared legal article shell.
- Cover both audiences:
  - **Clinicians** — account data (name, email, hashed password), practice activity, notification preferences.
  - **Patients** — pseudonymous by default (anonymous ID + clinician display name); assessment responses/scores linked to that ID.
- State clearly that identity details (name, email, phone, age, contextual questions, etc.) are collected **only with explicit patient consent**, and only when the clinician enables an intake step for that link.
- Explain who can see data (treating clinician only), how it is protected (expiring links, encryption in transit, authenticated access), and patient/clinician rights (access, correction, deletion).
- Cross-link the retention policy.
- Leave a contact email placeholder until a real address is ready for publication.

**Key files:**
- `app/legal/privacy/page.tsx`
- `components/legal/legal-article.tsx`

**Acceptance:**
- Page is publicly readable without login.
- Copy matches the intended product behavior (consent-first, clinician-scoped data).
- Linked from landing footer and other legal pages.

---

## 3. Data retention policy

**Task:** Publish a public Data retention policy page.

**Description:**
- Create `/legal/retention`.
- Principle: keep clinical data for the life of the clinical relationship; delete when the clinician deletes the patient (or their account).
- Spell out retention for:
  - Assessment responses and scores
  - Patient identity details (consent-gated)
  - Consent records (kept as long as the data they authorize)
  - Expired unused assessment links
- Document deletion paths (delete patient, delete clinician account, patient requests via clinician).
- Note that professional record-keeping obligations still sit with the clinician; APAS deletion does not override license rules.

**Key files:**
- `app/legal/retention/page.tsx`
- `components/legal/legal-article.tsx`

**Acceptance:**
- Publicly readable; consistent with privacy copy.
- Linked from landing footer and privacy policy.

---

## 4. Terms of service

**Task:** Publish a public Terms of service page alongside privacy and retention.

**Description:**
- Create `/legal/terms`.
- Cover acceptable use by clinicians (licensed use, consent obligations before sending links, responsible use of the details-collection option).
- State that APAS is decision support, not a substitute for clinical judgment.
- Cover account responsibility, service changes, and a contact placeholder.

**Key files:**
- `app/legal/terms/page.tsx`
- `components/legal/legal-article.tsx`

**Acceptance:**
- Publicly readable; linked from landing footer and other legal pages.

---

## 5. Collect patient data (consent-first)

**Task:** Implement optional, consent-gated collection of patient identity / intake details.

**Description:**

This is the product feature the legal pages describe. Today patients are effectively anonymous (`anonymousId` + clinician `displayName`). The new behavior:

### 5.1 Clinician side — enable collection per link
- When creating / sending an assessment session link, clinician can opt in to “Collect patient details on this link.”
- Default is **off** (anonymous).
- Clinician can choose which fields to request (e.g. name, email, phone, age, and a small set of contextual questions such as family size / employment — keep the set small and configurable).

### 5.2 Patient side — consent before any identifying questions
- If the link has collection enabled, the fill flow shows a **consent screen first**.
- No identifying fields render until the patient explicitly agrees.
- If the patient declines, they are told to close the link and contact their clinician (do not silently collect anything).
- After consent, show only the fields the clinician enabled, then continue into the questionnaire as today.

### 5.3 Data model
- Persist consent (when given, for which session/link, which fields authorized).
- Store collected identity / intake fields on the patient or a related profile record, scoped to the treating clinician.
- Tie retention/deletion of identity details to the patient record (delete patient → delete identity + consent proof together).

### 5.4 Clinician visibility
- Collected details visible on the patient profile / session context for the owning clinician only.
- Do not surface identifying fields in public or shared surfaces.

### 5.5 Enforcement
- API must reject identity payloads unless the session has collection enabled **and** a valid consent record exists for that session.
- Do not rely on UI alone.

**Likely touchpoints:**
- `prisma/schema.prisma` (consent + identity fields / related models)
- Session create UI + API (`components/patients/*`, `app/api/patients/[id]/sessions/*`)
- Patient fill flow (`app/fill/[token]/*`, `components/questionnaire/*`)
- Patient profile UI (show consented details)
- Tests for consent gate and API rejection paths

**Acceptance:**
- New links default to anonymous (no intake).
- With collection enabled: consent screen appears; no identity stored without consent.
- With collection disabled: fill flow unchanged; identity payloads rejected.
- Clinician can view consented details; deleting the patient removes them.
- Privacy / retention copy remains accurate after implementation.

---

## 6. Shared legal shell & navigation

**Task:** Reuse one layout for all legal documents and keep cross-links consistent.

**Description:**
- Shared `LegalArticle` component (title, last-updated, prose styles, footer nav between Privacy / Terms / Retention).
- Landing footer and auth surfaces can deep-link to the same routes.
- Update auth branding copy where it already claims “consent-first privacy” so it stays aligned with the real feature once shipped.

**Key files:**
- `components/legal/legal-article.tsx`
- `components/landing/landing-page.tsx`
- `components/layout/auth-layout.tsx`

---

## Suggested build order

| Order | Task | Notes |
|------:|------|-------|
| 1 | Legal shell + Privacy / Retention / Terms | Can publish copy before the feature ships, as long as contact placeholders stay marked |
| 2 | Landing page | Depends on legal routes existing for footer links |
| 3 | Schema + consent/identity models | Foundation for collection |
| 4 | Clinician “collect details” toggle on link create | Opt-in per session |
| 5 | Patient consent screen + intake fields in fill flow | Must gate every identifying question |
| 6 | API enforcement + clinician profile display | Hard gate + visibility |
| 7 | Tests + polish contact email placeholders | Before calling the policies “published” |

---

## Out of scope (for this plan)

- Full HIPAA / BAA legal review (policies are product copy; counsel review is separate).
- Email delivery of assessment links or privacy notices (still needs an email provider).
- Patient self-service portal (patients still use token links only).
- Supervisor / multi-clinician sharing of patient identity details.

---

## Current progress snapshot

| Item | Status |
|------|--------|
| Landing page UI | Drafted (`components/landing/landing-page.tsx`, `app/page.tsx`) |
| Privacy / Terms / Retention pages | Drafted under `app/legal/*` |
| Shared `LegalArticle` shell | Drafted |
| Auth copy aligned to consent-first messaging | Drafted |
| Consent + identity data model | Not built |
| Clinician per-link collection toggle | Not built |
| Patient consent / intake UI in fill flow | Not built |
| API enforcement for identity payloads | Not built |
| Real contact email on legal pages | Placeholder only |

---

## Summary

This plan ships three public surfaces (landing, privacy, retention — plus terms) and one product capability: **optional, consent-first patient data collection per assessment link**. Legal copy and marketing must stay aligned with the implementation: anonymous by default, identifying details only after explicit patient consent.
