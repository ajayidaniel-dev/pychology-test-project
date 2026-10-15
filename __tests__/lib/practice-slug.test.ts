import {
  isValidPracticeSlug,
  slugifyPracticeName,
} from "@/lib/practice-slug"

describe("practice slug helpers", () => {
  it("slugifies a clinic name", () => {
    expect(slugifyPracticeName("Renaissance Psychological Services")).toBe(
      "renaissance-psychological-services",
    )
  })

  it("strips accents and collapses punctuation", () => {
    expect(slugifyPracticeName("Café & Co.")).toBe("cafe-co")
  })

  it("accepts valid slugs", () => {
    expect(isValidPracticeSlug("harbor")).toBe(true)
    expect(isValidPracticeSlug("a1")).toBe(true)
  })

  it("rejects invalid slugs", () => {
    expect(isValidPracticeSlug("A")).toBe(false)
    expect(isValidPracticeSlug("-bad")).toBe(false)
    expect(isValidPracticeSlug("has spaces")).toBe(false)
  })
})
