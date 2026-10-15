#!/usr/bin/env node
/**
 * Contrast gate for the APAS design tokens.
 *
 * Parses the real `:root` and `.dark` blocks out of app/globals.css and checks
 * every text pairing that carries clinical meaning. Run it after any token
 * change; it exits non-zero on an AA failure.
 *
 *   node scripts/check-contrast.mjs
 *
 * Why this exists: the severity badge shipped for months setting text in the
 * same colour as its own 15% tint, which fails AA at every hue (measured 2.02:1
 * to 3.99:1). PRODUCT.md treats a missed alert as a patient-safety failure, so
 * the severity ramp gets an automated gate rather than a design review.
 *
 * Note on dark surfaces: WCAG contrast ratio is NOT used to judge surface
 * separation. The ratio's +0.05 term dominates near black, so every near-black
 * pair scores ~1.0 no matter how separated it looks. Surface steps are reported
 * as OKLCH lightness deltas, which are perceptually uniform.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSS = readFileSync(join(ROOT, 'app/globals.css'), 'utf8')

/* ---------- colour maths ---------- */

function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  const inGamut = lin.every((x) => x >= -0.001 && x <= 1.001)
  const enc = (x) => {
    const c = Math.max(0, Math.min(1, x))
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  }
  return Object.assign(lin.map(enc), { inGamut })
}

const luminance = ([r, g, b]) => {
  const lin = (x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

const contrast = (fg, bg) => {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** Composite `fg` at `alpha` over `bg` — what Tailwind's `/15` produces. */
const over = (fg, bg, alpha) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha))

/* ---------- token parsing ---------- */

function parseBlock(selector) {
  const re = new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
  const match = CSS.match(re)
  if (!match) throw new Error(`Could not find CSS block: ${selector}`)
  const tokens = {}
  for (const [, name, L, C, H] of match[1].matchAll(
    /--([\w-]+):\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/g,
  )) {
    tokens[name] = { L: +L, C: +C, H: +H, rgb: oklchToRgb(+L, +C, +H) }
  }
  return tokens
}

const light = parseBlock(':root')
const dark = { ...light, ...parseBlock('\\.dark') }

/* ---------- checks ---------- */

const results = []
const check = (mode, label, fg, bg, min, note = '') => {
  const value = contrast(fg, bg)
  results.push({ mode, label, value, min, pass: value >= min, note })
}

const SEVERITIES = ['critical', 'high', 'moderate', 'low']

for (const [mode, t] of [
  ['light', light],
  ['dark', dark],
]) {
  // Severity badge: text-xs weight 500 is small text, so 4.5:1 applies.
  for (const level of SEVERITIES) {
    const fill = t[`severity-${level}`]
    const ink = t[`severity-${level}-ink`]
    if (!fill || !ink) throw new Error(`Missing severity token for ${level} (${mode})`)
    const badgeBg = over(fill.rgb, t.card.rgb, 0.15)
    check(mode, `severity badge · ${level}`, ink.rgb, badgeBg, 4.5)
    if (!ink.rgb.inGamut) {
      results.push({
        mode,
        label: `severity ink · ${level}`,
        value: NaN,
        min: NaN,
        pass: false,
        note: 'out of sRGB gamut — browser will clip it',
      })
    }
  }

  // SeverityMeter segments are small non-text marks: WCAG 1.4.11 wants 3:1
  // against the surface behind them, or the bar is decoration rather than
  // signal. This is why the meter draws in ink rather than fill — several fill
  // tones sit near 2:1 on a light card.
  for (const level of SEVERITIES) {
    check(
      mode,
      `severity meter · ${level}`,
      t[`severity-${level}-ink`].rgb,
      t.card.rgb,
      3,
    )
  }

  check(mode, 'body text on background', t.foreground.rgb, t.background.rgb, 4.5)
  check(mode, 'body text on card', t['card-foreground'].rgb, t.card.rgb, 4.5)
  check(mode, 'muted text on background', t['muted-foreground'].rgb, t.background.rgb, 4.5)
  check(mode, 'muted text on card', t['muted-foreground'].rgb, t.card.rgb, 4.5)
  check(mode, 'primary label on primary fill', t['primary-foreground'].rgb, t.primary.rgb, 4.5)
  check(mode, 'link/accent on background', t.primary.rgb, t.background.rgb, 4.5)
  check(
    mode,
    'destructive label on fill',
    t['destructive-foreground'].rgb,
    t.destructive.rgb,
    4.5,
  )
  check(mode, 'sidebar text on sidebar', t['sidebar-foreground'].rgb, t.sidebar.rgb, 4.5)
  // Sidebar critical-alert badge: white on the solid severity fill.
  check(
    mode,
    'critical badge label on fill',
    oklchToRgb(1, 0, 0),
    t['severity-critical'].rgb,
    4.5,
  )
}

/* ---------- report ---------- */

const pad = (s, n) => String(s).padEnd(n)
let failed = 0

console.log('\nAPAS token contrast gate\n' + '='.repeat(58))
let currentMode = null
for (const r of results) {
  if (r.mode !== currentMode) {
    currentMode = r.mode
    console.log(`\n[${currentMode}]`)
  }
  const value = Number.isNaN(r.value) ? '  --  ' : r.value.toFixed(2).padStart(6)
  const status = r.pass ? 'pass' : 'FAIL'
  if (!r.pass) failed++
  console.log(`  ${pad(r.label, 34)} ${value}  ${status} ${r.note}`)
}

console.log('\n[dark surface separation — OKLCH dL, not WCAG ratio]')
const dl = (a, b) => (dark[a].L - dark[b].L).toFixed(3)
console.log(`  ${pad('card above background', 34)} ${dl('card', 'background').padStart(6)}`)
console.log(`  ${pad('border above background', 34)} ${dl('border', 'background').padStart(6)}`)
console.log(`  ${pad('border above card', 34)} ${dl('border', 'card').padStart(6)}`)

console.log('\n' + '='.repeat(58))
if (failed) {
  console.error(`${failed} contrast failure(s). Tokens must not ship in this state.\n`)
  process.exit(1)
}
console.log(`All ${results.length} pairings pass WCAG AA.\n`)
