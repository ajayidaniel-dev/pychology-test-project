import { LandingOverwatch } from "@/components/landing/landing-overwatch"

export const metadata = {
  title: "Landing C · Overwatch (homepage)",
  description:
    "APAS landing composition C — promoted Quiet Room Overwatch homepage.",
}

/** Compare route mirrors the production homepage for side-by-side review. */
export default function CompareCPage() {
  return <LandingOverwatch />
}
