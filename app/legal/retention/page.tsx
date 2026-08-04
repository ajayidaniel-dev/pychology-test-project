import { LegalArticle } from "@/components/legal/legal-article"

export const metadata = {
  title: "Data retention",
}

export default function DataRetentionPage() {
  return (
    <LegalArticle title="Data retention policy" lastUpdated="August 4, 2026">
      <h2>The principle</h2>
      <p>
        Patient data is retained for the practice that owns the record, for as
        long as it serves that practice&apos;s care of the patient, and no
        longer. Longitudinal tracking is the product&apos;s purpose — severity
        trends only exist if history is kept — so retention defaults to the
        life of the clinical relationship, with deletion available at any time
        to authorised practice staff.
      </p>

      <h2>What is kept, and for how long</h2>
      <ul>
        <li>
          <strong>Assessment responses and scores</strong> are retained while
          the patient record exists, so trends and deltas remain accurate.
        </li>
        <li>
          <strong>Patient identity details</strong> (collected only with
          consent) are retained alongside the patient record and deleted with
          it.
        </li>
        <li>
          <strong>Consent records</strong> (when consent was given, and for
          what) are retained as long as the data they authorize, because they
          are the proof the data is lawfully held.
        </li>
        <li>
          <strong>Expired assessment links</strong> become unusable
          immediately at expiry; unused expired sessions serve no clinical
          purpose and may be purged.
        </li>
      </ul>

      <h2>Deletion</h2>
      <ul>
        <li>
          Authorised practice staff can delete a patient record at any time.
          Deletion removes the patient&apos;s assessment history, scores, and
          any identity details for that practice.
        </li>
        <li>
          Leaving a practice or deleting a staff account does not delete the
          practice&apos;s patient records; those remain with the practice.
        </li>
        <li>
          Patients may request deletion through their practice / clinician,
          who control the records.
        </li>
      </ul>
      <p>
        Deleted data may persist briefly in encrypted backups before those
        backups age out; it is not restored to the live system.
      </p>

      <h2>A note on professional obligations</h2>
      <p>
        Many jurisdictions require clinicians to retain clinical records for a
        minimum period. APAS deletion controls do not override those
        obligations — clinicians remain responsible for keeping whatever
        records their license requires, in whatever system they designate for
        record-keeping.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about retention: [contact email — to be added before
        publication].
      </p>
    </LegalArticle>
  )
}
