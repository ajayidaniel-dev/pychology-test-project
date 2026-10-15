import {
  equivalentSectionPath,
  isAccountPath,
  practicePath,
  practiceRoot,
  stripPracticePrefix,
} from "@/lib/practice-path"

describe("practice paths", () => {
  describe("practicePath", () => {
    it("prefixes a practice-relative path", () => {
      expect(practicePath("renaissance", "/patients/123")).toBe(
        "/p/renaissance/patients/123",
      )
    })

    it("is idempotent — applying it twice does not double the prefix", () => {
      // Server and client helpers can both touch a path on its way to a Link;
      // a second application must be a no-op rather than a broken URL.
      const once = practicePath("renaissance", "/patients")
      expect(practicePath("renaissance", once)).toBe(once)
    })

    it("leaves account-level paths alone", () => {
      // /account belongs to the human, not a practice.
      expect(practicePath("renaissance", "/account")).toBe("/account")
      expect(practicePath("renaissance", "/auth/signin")).toBe("/auth/signin")
      expect(practicePath("renaissance", "/fill/abc")).toBe("/fill/abc")
      expect(practicePath("renaissance", "/invitations/tok")).toBe(
        "/invitations/tok",
      )
      expect(practicePath("renaissance", "/onboarding")).toBe("/onboarding")
    })

    it("prefixes practice settings and billing", () => {
      expect(practicePath("renaissance", "/settings")).toBe(
        "/p/renaissance/settings",
      )
      expect(practicePath("renaissance", "/billing")).toBe(
        "/p/renaissance/billing",
      )
    })

    it("encodes a slug that would otherwise break the path", () => {
      expect(practiceRoot("a/b")).toBe("/p/a%2Fb")
    })

    it("tolerates a path with no leading slash", () => {
      expect(practicePath("x", "patients")).toBe("/p/x/patients")
    })
  })

  describe("isAccountPath", () => {
    it("matches a section and its children but not a lookalike prefix", () => {
      expect(isAccountPath("/account")).toBe(true)
      expect(isAccountPath("/account/security")).toBe(true)
      // Practice settings are practice-scoped, not account-level.
      expect(isAccountPath("/settings")).toBe(false)
      // Would be a false positive under a naive startsWith check.
      expect(isAccountPath("/account-for-practices")).toBe(false)
    })
  })

  describe("stripPracticePrefix", () => {
    it("removes the prefix", () => {
      expect(stripPracticePrefix("/p/renaissance/patients/1")).toBe(
        "/patients/1",
      )
    })

    it("returns the dashboard when the practice root is bare", () => {
      expect(stripPracticePrefix("/p/renaissance")).toBe("/dashboard")
    })

    it("passes through a path that carries no prefix", () => {
      expect(stripPracticePrefix("/settings")).toBe("/settings")
    })
  })

  describe("equivalentSectionPath", () => {
    it("keeps the section but drops record ids when switching practice", () => {
      // Patient `abc` in one practice is not patient `abc` in another, so
      // carrying the full path across would reliably 404.
      expect(equivalentSectionPath("/p/a/patients/abc/sessions/xyz")).toBe(
        "/patients",
      )
      expect(equivalentSectionPath("/p/a/batches/123")).toBe("/batches")
    })

    it("keeps practice settings when switching practice", () => {
      expect(equivalentSectionPath("/p/a/settings")).toBe("/settings")
      expect(equivalentSectionPath("/p/a/billing")).toBe("/billing")
    })

    it("falls back to the dashboard for anything unrecognised", () => {
      expect(equivalentSectionPath("/p/a/unknown-section")).toBe("/dashboard")
      expect(equivalentSectionPath("/")).toBe("/dashboard")
    })
  })
})
