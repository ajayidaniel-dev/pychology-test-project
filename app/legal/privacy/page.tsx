import { LegalArticle } from "@/components/legal/legal-article"

export const metadata = {
  title: "Privacy policy",
}

export default function PrivacyPolicyPage() {
  return (
    <LegalArticle title="Privacy policy" lastUpdated="August 4, 2026">
      <h2>Who is responsible for your data</h2>
      <p>
        APAS (Automated Psychological Assessment Scoring) is a platform that
        helps practices administer standardized psychology questionnaires,
        score responses, and monitor severity over time.
      </p>
      <p>
        <strong>
          The practice that invited you — your clinic — is the data controller
        </strong>{" "}
        for patient assessment data. They decide why it is collected and how
        long it is kept. APAS provides the software and hosts the data on the
        practice&apos;s behalf; APAS does not use patient responses for its own
        purposes, advertising, or product training.
      </p>
      <p>
        This policy covers two kinds of people: <strong>staff</strong> who hold
        an APAS account at a practice, and <strong>patients</strong> who
        complete assessments through a link their practice sends them.
      </p>

      <h2>What we collect from staff</h2>
      <ul>
        <li>Account details: name, email address, and a hashed password.</li>
        <li>
          Practice activity: the scales you configure, the assessment links
          you create, membership and role, and notification preferences.
        </li>
      </ul>

      <h2>What practices collect from patients</h2>
      <p>
        <strong>By default, patients are pseudonymous.</strong> A patient
        record consists of an anonymous identifier and a display name chosen
        by the practice. When you complete an assessment, APAS stores your
        item responses, the calculated scores, and severity classifications —
        linked to that identifier, not to your legal identity — for the
        practice that sent the link.
      </p>
      <p>
        <strong>Identity details are collected only with your explicit
        consent.</strong> Your practice may enable an intake step for a
        specific assessment link that asks for personal details (such as your
        name, email, phone number, age, or contextual questions like family
        size or employment). Before any of those questions appear, you are
        shown a consent screen; nothing identifying is collected unless you
        agree. If you do not consent, close the link and contact your
        clinician about alternatives.
      </p>

      <h2>Who can see patient information</h2>
      <ul>
        <li>
          <strong>Your practice.</strong> Assessment responses, scores, and
          any details you consent to share are visible to staff at that
          practice according to the roles and access rules they configure
          (for example, your treating clinician and, where used, a care team
          or area).
        </li>
        <li>
          <strong>Not APAS for its own ends.</strong> APAS does not sell data,
          does not use patient data for advertising, and does not share it
          with third parties except the infrastructure providers that host the
          service for the practice.
        </li>
      </ul>

      <h2>How we protect it</h2>
      <ul>
        <li>Assessment links are single-use and expire automatically.</li>
        <li>Data is encrypted in transit.</li>
        <li>
          Access is restricted to authenticated members of the practice that
          owns the record.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You may ask, at any time, to access, correct, or delete information
        held about you. Patients should direct requests to their practice /
        clinician, who control the records. Staff can remove patient records
        and their own account data from within APAS. See also our{" "}
        <a href="/legal/retention">data retention policy</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about a specific patient record: contact the practice named
        on your assessment link. Questions about the APAS platform itself:
        [contact email — to be added before publication].
      </p>
    </LegalArticle>
  )
}
