import { NextResponse } from "next/server"
import { isPracticeWritable, practiceNotActive } from "@/lib/practices"
import { brandingTaglineFromSettings } from "@/lib/practice-slug"

describe("practice gate helpers", () => {
  it("only ACTIVE practices are writable", () => {
    expect(isPracticeWritable("ACTIVE")).toBe(true)
    expect(isPracticeWritable("PENDING_VERIFICATION")).toBe(false)
    expect(isPracticeWritable("SUSPENDED")).toBe(false)
  })

  it("practiceNotActive returns 403 for pending and suspended", async () => {
    const pending = practiceNotActive("PENDING_VERIFICATION")
    expect(pending).toBeInstanceOf(NextResponse)
    expect(pending!.status).toBe(403)
    const body = await pending!.json()
    expect(body.error).toMatch(/pending verification/i)

    const suspended = practiceNotActive("SUSPENDED")
    expect(suspended!.status).toBe(403)

    expect(practiceNotActive("ACTIVE")).toBeNull()
  })

  it("reads branding tagline from settings JSON", () => {
    expect(
      brandingTaglineFromSettings({ branding: { tagline: " Care, clearly " } }),
    ).toBe("Care, clearly")
    expect(brandingTaglineFromSettings(null)).toBeNull()
    expect(brandingTaglineFromSettings({})).toBeNull()
  })
})
