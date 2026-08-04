import {
  invitationExpiresAt,
  invitationUrl,
  INVITATION_TTL_MS,
  normalizeInviteEmail,
} from "@/lib/invitations"

describe("invitation helpers", () => {
  it("normalises invite emails for matching", () => {
    expect(normalizeInviteEmail("  Ada@Clinic.Example ")).toBe(
      "ada@clinic.example",
    )
  })

  it("builds a stable accept URL", () => {
    expect(invitationUrl("tok-1", "https://apas.example/")).toBe(
      "https://apas.example/invitations/tok-1",
    )
  })

  it("expires invitations after seven days", () => {
    const from = new Date("2026-08-04T12:00:00.000Z")
    expect(invitationExpiresAt(from).getTime() - from.getTime()).toBe(
      INVITATION_TTL_MS,
    )
  })
})
