import { LegalArticle } from "@/components/legal/legal-article"

export const metadata = {
  title: "Terms of service",
}

export default function TermsOfServicePage() {
  return (
    <LegalArticle title="Terms of service" lastUpdated="August 4, 2026">
      <h2>What APAS is — and is not</h2>
      <p>
        APAS is decision-support software for practices and the licensed
        clinicians who work in them. It scores standardized psychology
        questionnaires, tracks severity over time, and raises threshold
        alerts. <strong>It is not a medical device, not a diagnostic tool,
        and never a substitute for clinical judgment.</strong> Every score and
        alert APAS produces is input to a clinician&apos;s own assessment, not
        a conclusion. The practice that holds the patient record is responsible
        for clinical use of that data; APAS is the platform that stores and
        scores it.
      </p>
      <p>
        <strong>APAS is not an emergency service.</strong> If you or someone
        you know is in immediate danger or crisis, contact local emergency
        services or a crisis line now — do not wait for a questionnaire to be
        scored.
      </p>

      <h2>Who may hold an account</h2>
      <p>
        Clinician accounts are intended for licensed mental-health
        professionals and the staff working under their supervision. By
        creating an account you confirm that you are qualified to administer
        and interpret the instruments you use, and that you will use APAS in
        accordance with the professional and legal obligations that apply to
        your practice.
      </p>

      <h2>Your responsibilities as a practice</h2>
      <ul>
        <li>
          The practice is the data controller for patient records created under
          its membership. Owners and admins must keep registration and contact
          details accurate and ensure only authorised staff have access.
        </li>
        <li>
          Obtain any consent your jurisdiction requires before sending a
          patient an assessment link, and use the details-collection option
          only where you have a lawful basis to hold identifying information.
        </li>
        <li>
          Keep account credentials secure; you are responsible for activity
          under your membership.
        </li>
        <li>
          Review alerts with your own judgment. Alert thresholds are aids, and
          a quiet dashboard is not an assurance that no patient needs
          attention.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <ul>
        <li>No use for any purpose other than legitimate clinical practice.</li>
        <li>
          No attempts to re-identify pseudonymous data that is not yours to
          identify.
        </li>
        <li>No probing, disrupting, or circumventing security measures.</li>
      </ul>

      <h2>Availability and liability</h2>
      <p>
        APAS is provided on an as-is basis. We work to keep the service
        available and accurate, but we do not guarantee uninterrupted
        operation, and we are not liable for clinical decisions made using it.
        Maintain your own record-keeping consistent with your professional
        obligations.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms as the product evolves. Material changes
        will be announced in the product, and the date above always reflects
        the current version. Continued use after a change constitutes
        acceptance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: [contact email — to be added before
        publication].
      </p>
    </LegalArticle>
  )
}
