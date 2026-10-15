#!/usr/bin/env node
/**
 * Screenshot every authenticated surface, at several viewports, in both themes.
 *
 *   APAS_EMAIL=... APAS_PASSWORD=... node scripts/visual-check.mjs
 *
 * Credentials come from the environment and are never written to disk or
 * committed. Output lands in `screenshots/` (gitignored).
 *
 * Requires the dev server to already be running on APAS_BASE_URL
 * (default http://localhost:3000).
 */

import { mkdir, rm } from "node:fs/promises"
import { join } from "node:path"
import puppeteer from "puppeteer"

const BASE = process.env.APAS_BASE_URL ?? "http://localhost:3000"
const EMAIL = process.env.APAS_EMAIL
const PASSWORD = process.env.APAS_PASSWORD
const OUT = join(process.cwd(), "screenshots")

if (!EMAIL || !PASSWORD) {
  console.error("Set APAS_EMAIL and APAS_PASSWORD in the environment.")
  process.exit(1)
}

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 900 },
}

/** [name, path]. `:patient` is substituted with the first patient found. */
const PUBLIC_PAGES = [
  ["auth-signin", "/auth/signin"],
  ["auth-signup", "/auth/signup"],
  ["auth-forgot", "/auth/forgot-password"],
  ["auth-verify", "/auth/verify-email"],
]

const APP_PAGES = [
  ["dashboard", "/dashboard"],
  ["patients", "/patients"],
  ["batches", "/batches"],
  ["scales", "/scales"],
  ["settings", "/settings"],
]

async function setTheme(page, theme) {
  // next-themes reads localStorage then stamps the class on <html>.
  await page.evaluate((t) => {
    localStorage.setItem("theme", t)
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(t)
  }, theme)
}

async function shoot(page, name, viewport, theme) {
  await page.setViewport(VIEWPORTS[viewport])
  await setTheme(page, theme)
  // Let the class change settle and any entrance animation finish.
  await new Promise((r) => setTimeout(r, 450))
  const file = join(OUT, `${name}--${viewport}--${theme}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

async function main() {
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const browser = await puppeteer.launch({ headless: "new" })
  const page = await browser.newPage()
  page.setDefaultTimeout(30_000)

  const errors = []
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text())
  })
  page.on("pageerror", (e) => errors.push(String(e)))

  const captured = []

  // ---- public surfaces -------------------------------------------------
  for (const [name, path] of PUBLIC_PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" })
    for (const theme of ["light", "dark"]) {
      captured.push(await shoot(page, name, "desktop", theme))
    }
  }
  await page.goto(`${BASE}/auth/signin`, { waitUntil: "networkidle0" })
  captured.push(await shoot(page, "auth-signin", "mobile", "dark"))

  // ---- sign in ---------------------------------------------------------
  await page.goto(`${BASE}/auth/signin`, { waitUntil: "networkidle0" })
  await page.type('input[type="email"]', EMAIL)
  await page.type('input[type="password"]', PASSWORD)
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
    page.click('button[type="submit"]'),
  ])
  await new Promise((r) => setTimeout(r, 2500))

  if (page.url().includes("/auth/signin")) {
    const msg = await page
      .$eval('[role="alert"]', (el) => el.textContent)
      .catch(() => "no alert text found")
    console.error(`Sign-in failed. Still on ${page.url()} — ${msg}`)
    await shoot(page, "SIGNIN-FAILED", "desktop", "dark")
    await browser.close()
    process.exit(1)
  }
  console.log(`Signed in, landed on ${page.url()}`)

  // ---- app surfaces ----------------------------------------------------
  for (const [name, path] of APP_PAGES) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" })
    for (const theme of ["light", "dark"]) {
      captured.push(await shoot(page, name, "desktop", theme))
    }
  }

  // Dashboard + patients also at mobile and tablet: the layout forks there.
  for (const [name, path] of [
    ["dashboard", "/dashboard"],
    ["patients", "/patients"],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" })
    for (const vp of ["mobile", "tablet"]) {
      captured.push(await shoot(page, name, vp, "dark"))
    }
  }

  // ---- first patient record, every tab ---------------------------------
  await page.goto(`${BASE}/patients`, { waitUntil: "networkidle0" })
  const href = await page
    .$$eval('a[href^="/patients/"]', (as) => {
      const hit = as
        .map((a) => a.getAttribute("href"))
        .find((h) => h && /^\/patients\/[^/]+$/.test(h))
      return hit ?? null
    })
    .catch(() => null)

  if (href) {
    await page.goto(`${BASE}${href}`, { waitUntil: "networkidle0" })
    for (const theme of ["light", "dark"]) {
      captured.push(await shoot(page, "patient-record", "desktop", theme))
    }
    const tabs = await page.$$('[role="tab"]')
    for (let i = 1; i < tabs.length; i++) {
      const label = await page.evaluate(
        (el) => el.textContent?.trim().split(/\s+/)[0].toLowerCase(),
        tabs[i],
      )
      await tabs[i].click()
      await new Promise((r) => setTimeout(r, 350))
      captured.push(await shoot(page, `patient-tab-${label}`, "desktop", "dark"))
    }
    await page.goto(`${BASE}${href}`, { waitUntil: "networkidle0" })
    captured.push(await shoot(page, "patient-record", "mobile", "dark"))
  } else {
    console.log("No patient records found — skipping record captures.")
  }

  // ---- command palette -------------------------------------------------
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle0" })
  await page.setViewport(VIEWPORTS.desktop)
  await page.keyboard.down("Meta")
  await page.keyboard.press("KeyK")
  await page.keyboard.up("Meta")
  await new Promise((r) => setTimeout(r, 800))
  captured.push(await shoot(page, "command-palette", "desktop", "dark"))

  await browser.close()

  console.log(`\n${captured.length} screenshots written to ${OUT}`)
  if (errors.length) {
    console.log(`\n${errors.length} console error(s):`)
    for (const e of [...new Set(errors)].slice(0, 15)) console.log(`  - ${e}`)
  } else {
    console.log("No console errors.")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
