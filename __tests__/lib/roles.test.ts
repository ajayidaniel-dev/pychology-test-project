import { can, isAssignableRole, ASSIGNABLE_ROLES } from "@/lib/roles"

describe("roles", () => {
  it("lets Owner and Admin manage the team and areas, and nobody else", () => {
    expect(can("OWNER", "manageTeam")).toBe(true)
    expect(can("ADMIN", "manageTeam")).toBe(true)
    expect(can("OWNER", "manageAreas")).toBe(true)
    expect(can("CLINICIAN", "manageTeam")).toBe(false)
    expect(can("FRONT_DESK", "manageAreas")).toBe(false)
  })

  it("keeps referrals off Front desk", () => {
    expect(can("CLINICIAN", "manageReferrals")).toBe(true)
    expect(can("FRONT_DESK", "manageReferrals")).toBe(false)
  })

  it("keeps notes and scores off Admin and Front desk", () => {
    // Admin runs the practice but is not a clinical role. Front desk schedules
    // but must never see results. That is the single most important row in the
    // permission matrix.
    for (const role of ["ADMIN", "FRONT_DESK"] as const) {
      expect(can(role, "viewNotes")).toBe(false)
      expect(can(role, "viewScores")).toBe(false)
      expect(can(role, "writeNotes")).toBe(false)
    }
    for (const role of ["OWNER", "CLINICIAN", "SUPERVISOR"] as const) {
      expect(can(role, "viewNotes")).toBe(true)
      expect(can(role, "viewScores")).toBe(true)
    }
  })

  it("does not offer Owner as an assignable invite role", () => {
    expect(ASSIGNABLE_ROLES).not.toContain("OWNER")
    expect(isAssignableRole("OWNER")).toBe(false)
    expect(isAssignableRole("CLINICIAN")).toBe(true)
  })

  it("reserves billing for the Owner alone", () => {
    expect(can("OWNER", "manageBilling")).toBe(true)
    expect(can("ADMIN", "manageBilling")).toBe(false)
  })
})
