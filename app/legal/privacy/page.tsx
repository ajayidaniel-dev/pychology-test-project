import { LegalArticle } from "@/components/legal/legal-article"

export const metadata = {
  title: "Privacy policy",
}

export default function PrivacyPolicyPage() {
  return (
    <LegalArticle title="Privacy policy" lastUpdated="July 16, 2026">
      <h2>Who we are</h2>
      <p>
        APAS (Automated Psychological Assessment Scoring) is a tool that helps
        licensed clinicians administer standardized psychology questionnaires,
        score responses, and monitor severity over time. This policy explains
        what information APAS handles, who can see it, and the choices you
        have. It covers two kinds of people: <strong>clinicians</strong> who
        hold an APAS account, and <strong>patients</strong> who complete
        assessments through a link their clinician sends them.
      </p>

      <h2>What we collect from clinicians</h2>
      <ul>
        <li>Account details: name, email address, and a hashed password.</li>
        <li>
          Practice activity: the scales you configure, the assessment links
          you create, and notification preferences.
        </li>
      </ul>

      <h2>What we collect from patients</h2>
      <p>
        <strong>By default, patients are pseudonymous.</strong> A patient
        record consists of an anonymous identifier and a display name chosen
        by the clinician. When you complete an assessment, APAS stores your
        item responses, the calculated scores, and severity classifications —
        linked to that identifier, not to your legal identity.
      </p>
      <p>
        <strong>Identity details are collected only with your explicit
        consent.</strong> Your clinician may enable an intake step for a
        specific assessment link that asks for personal details (such as your
        name, email, phone number, age, or contextual questions like family
        size or employment). Before any of those questions appear, you are
        shown a consent screen; nothing identifying is collected unless you
        agree. If you do not consent, you should close the link and contact
        your clinician about alternatives.
      </p>

      <h2>Who can see patient information</h2>
      <ul>
        <li>
          <strong>Your clinician.</strong> Assessment responses, scores, and
          any details you consent to share are visible only to the clinician
          who sent you the link.
        </li>
        <li>
          <strong>Nobody else.</strong> APAS does not sell data, does not use
          patient data for advertising, and does not share it with third
          parties except the infrastructure providers that host the service.
        </li>
      </ul>

      <h2>How we protect it</h2>
      <ul>
        <li>Assessment links are single-use and expire automatically.</li>
        <li>Data is encrypted in transit.</li>
        <li>
          Access is restricted to the treating clinician&apos;s authenticated
          account.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You may ask, at any time, to access, correct, or delete information
        held about you. Patients should direct requests to their clinician,
        who controls the records; clinicians can remove patient records and
        their own account data from within APAS. See also our{" "}
        <a href="/legal/retention">data retention policy</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: [contact email — to be added before
        publication].
      </p>
    </LegalArticle>
  )
}
