# over9000 — Plan

**Status:** planning — K interview in progress (see §7).
Research backing every decision here: `RESEARCH.md`. Decisions log at the bottom.

---

## 1. Product definition

A free, no-account, client-side-only web toy: upload a photo → scouter scan animation →
power level + chosen fitness stats rendered as a scouter HUD → apply transformation
multipliers → share the image. The differentiator over all prior art (RESEARCH §4/§6) is
**polish + real stats**: animated scan, configurable scouter, honest scoring core, and the
shatter payoff. Nothing web-based does this today.

**Two-layer stats engine** (the key architectural idea, RESEARCH §5.3):

- **Honest layer** — every entered test normalises to 0–100 (%-of-elite / percentile,
  IPF GL for lifts), rolls up into category sub-scores (Strength / Power / Endurance /
  Skill) and a composite. More stats = higher *scan confidence*, not a bigger number.
- **Display layer** — the "power level" is a fun non-linear blow-up of the composite
  (elite humans break 9000); transformations are pure display multipliers on top
  (SSJ bench ×50). The honest layer never lies; the display layer never pretends to.

**Transformation set** (RESEARCH §2): Canon tier — Kaio-ken ×2/×4/×10/×20 (framed as "PR
attempt", canon body-strain caveat as flavour), Oozaru ×10, SSJ ×50, SSJ2 ×100, SSJ3 ×400.
Beyond-the-scouter tier — SSG/SSB/UI render `ERROR: DIVINE KI NOT DETECTABLE` (canon-faithful
gag, dodges fanon numbers).

**Set-piece moments:**
- Scan: reticle lock → beeping climb with original alien glyphs flickering → number slams
  to a stop (the canonical "analog counter" beat).
- Shatter: reading exceeds scouter limit (Easter egg threshold >9000, purist tooltip
  "technically it's 8000") → freeze, crack-flash, Voronoi shards fly.
- Insult readings for empty/low inputs ("power level of a Saibaman"), farmer=5 anchor,
  "readings off the chart" cap.

---

## 2. Tech stack (recommended — confirm at interview)

| Decision | Choice | Why |
|---|---|---|
| Framework | **Next.js 16, `output: 'export'`** (static) | K's home turf; prerendered shell + Metadata API for OG tags; file routing for future mini-games; `output: 'export'` drops all server ceremony (no cacheComponents wall, no middleware). Alternative if we fancy lighter: Vite+React SPA — either yields a pure static bundle. |
| Language/UI | TypeScript, Tailwind v4, React 19 | House standard. |
| Hosting | **Cloudflare Workers static assets** | The only free tier with **unlimited bandwidth** (survives a Reddit spike); free custom domain; same platform hosts the v1.1 OG Worker. NOT Netlify (credit-based free tier punishes viral traffic + K already rations Netlify credits). Note: Cloudflare *Pages* is legacy — start on Workers static assets. |
| Image pipeline | `accept` without `image/heic` (iOS auto-transcodes) → magic-byte sniff → lazy `heic2any` fallback → `createImageBitmap(file, {imageOrientation:'from-image'})` → live HUD as **SVG/DOM over the photo** → export via own **Canvas 2D draw** + `toBlob('image/jpeg', 0.9)` | No DOM-screenshot library; EXIF (incl. GPS) stripped by re-encode = privacy feature. |
| Share | **Web Share API Level 2 with files** as primary mobile CTA; `<a download>` fallback (iOS: lead with Share — download goes to Files, not Photos) | How the image actually reaches WhatsApp/IG/Photos. |
| Animation | CSS for sweep/flicker/glitch; **GSAP 3** (fully free since 2025) timeline for scan→calculate→reveal→shatter sequencing | Best sequencing tool, no licensing anxiety. |
| Shatter | **Canvas 2D Voronoi shards** via `d3-delaunay` (~10 kB) + rAF | Best looks-per-kilobyte; ~200 lines own code; no engine. |
| Face lock (v1.1) | Lazy **MediaPipe Face Detector** (`@mediapipe/tasks-vision`) auto-centres reticle; draggable fallback | The "magic" differentiator; still 100% client-side. |
| Fonts | Original glyph font for scouter cipher (design our own); Saiyan Sans OK for flavour headings, **not** the logo lockup | RESEARCH §3 licence + trade-dress caveat. |
| Persistence | localStorage only (stats, scouter prefs) — functional exemption, **no consent banner** | RESEARCH §6 privacy. |
| Analytics (later) | GoatCounter (free) or Plausible — still no banner. Never GA4 | — |
| OG cards | v1: static branded card. v1.1: one CF Worker with `workers-og` rendering power level from query params (`/?pl=9001&form=ssj`) | Crawlers can't see client-side composites; the number travels in the URL, the photo never leaves the device. |

Bundle budget: <50 kB gz first-load beyond framework; heic2any (~2.7 MB) and MediaPipe
strictly lazy-loaded.

## 3. Scoring engine design (RESEARCH §5)

- **Lifts:** accept 1RM or "weight × reps" (Epley/Brzycki/Wathan conversion, reject r>15);
  normalise via **IPF GL points** (coefficients verified from OpenPowerlifting source;
  100 ≈ world record → maps straight onto 0–100) with DOTS as cross-check.
- **Sprints/jumps/endurance:** %-of-elite bands from independently sourced norms
  (Topend/Legion/StrengthLog paraphrased; Army AFT tables are public-domain); Cooper and
  Uth formulas derive VO2 max from runs/RHR.
- **Age/sex:** IPF GL handles sex natively for lifts; McCulloch/Foster age coefficients
  ("age-corrected power level" is a feature, not a fudge); WMA-style age-grading for runs.
- **Validation:** troll caps table (RESEARCH §5.4), cross-field coherence → "scouter
  malfunction?" confidence penalty.
- **Units:** metric internal; imperial toggle (US default); mm:ss masks for times.
- **Legal:** never scrape strengthlevel.com (T&Cs prohibit derivative
  calculators/standards); derive any percentile tables from the OpenPowerlifting open
  dataset or public sources.

## 4. IP guardrails (operative summary — full assessment RESEARCH §3)

Zero copyrighted assets (original lens, glyphs, synthesised beep); footer disclaimer on
every page; genuinely non-commercial (no ads/merch/paid tier — money is the biggest risk
multiplier); parody/homage framing in copy; brand name swappable in one place
(`site.config.ts`) + register a fallback neutral domain; fold on first contact. Domain
"supersaiyan.me" is the single biggest exposure (MODERATE — worst case is losing the
domain, not damages; Toei's US "SUPER SAIYAN" mark went dead/abandoned in 2004, but verify
with a direct USPTO TESS search before committing hard to the name).

## 5. Phased build

- **Phase 0 — foundations. ✅ DONE 2026-08-10.** Next 16 `output:'export'` scaffold,
  Tailwind v4 CRT/arcade design system, `site.config.ts` (swappable brand), `netlify.toml`,
  disclaimer + privacy copy in footer. (Standalone privacy page still to come.)
- **Phase 1 — the scan (MVP). 🟡 CORE SHIPPED 2026-08-10.** Working: attract screen
  (PRESS START unlocks Web Audio, keyboard support, Hall of Legends top-5), photo upload →
  tap-to-place reticle → scan animation (sweep, glyph flicker, beeping count-up, lock-on) →
  seeded canon-scale power level + flavour + confidence → canvas share-card export
  (Web Share files / download, EXIF stripped) → Hall of Legends initials save. Verified
  in-browser via Playwright against the static build (deterministic rescan confirmed).
  Remaining for Phase 1 complete: scouter colour picker (red/blue/purple skins), HEIC
  fallback (lazy heic2any), static OG card image, GSAP sequencing polish if CSS/rAF ever
  feels limiting.
- **Phase 2 — the stats engine.** Full test catalogue input UI, two-layer scoring,
  category radar, scan confidence %, stat display toggles, localStorage save, unit toggle,
  validation + malfunction copy.
- **Phase 3 — transformations + shatter.** Multiplier engine, transformation picker with
  canon/beyond tiers, warning animations, Voronoi shatter at limit-break, insult readings.
- **Phase 4 — share polish.** Web Share files flow, parameterised OG Worker, purist
  tooltips/Easter eggs.
- **Phase 5 — magic + games.** MediaPipe face auto-lock; in-browser reaction-time test
  (median 273 ms benchmark — first *verifiable* stat) feeding the Skill category; more
  mini-tests later.

Each phase ships independently; Phase 1 alone is already shareable.

## 6. Repo home

Migrated from `kwameandco/clients/side-projects/supersaiyan/` to its own repo
**`kwameandco/over9000`** on 2026-08-10 (docs moved; planning history stays in the
clients repo). This repo is the single source of truth now.

## 7. Interview outcomes (2026-08-10) — all questions answered

| Decision | Outcome |
|---|---|
| Brand | **OVER 9000** (domain to acquire — over9000.me or similar; supersaiyan.me optional vanity redirect later). Brand stays swappable in `site.config.ts`. |
| Framework | **Next 16 `output: 'export'`**, TypeScript, Tailwind v4, React 19 |
| Hosting | **Netlify free tier** (K's call; static export stays 100% portable so a lift to Cloudflare later is config-only) |
| Art direction | **Arcade attract mode** — PRESS START attract screen, chunky bevel buttons, CRT scanlines native to the whole cabinet; Geocities/shrine garnish confined to the footer |
| Bare scan | Cheeky low-confidence read — number seeded from the image (stable per photo), `CONFIDENCE: 12% — SUBJECT UNVERIFIED`, insult-tier flavour, "ADD COMBAT DATA" upsell |
| Power curve | **Canon base + transforms go nuclear** — humans read 5–low-thousands untransformed; only transformations pass 9000, which is when the scouter shatters (earned, not free) |
| Sex/age | Optional dropdowns with generic default + `CALIBRATION: DEFAULT` readout note |
| Sound | **PRESS START unlocks Web Audio** — synthesised beeps/coin blips/shatter crunch (no audio files, no rips); persistent ON/OFF toggle in localStorage |
| v1 stats scope | **All four groups**: strength core (IPF GL), bodyweight basics, speed & power, endurance |
| Footer garnish | Yes — seeded hit counter, badge wall, under-construction GIFs, shrine-style updates log |
| High scores | Yes — "HALL OF LEGENDS", localStorage top-10 with 3-letter arcade initials |

## 7b. Original interview questions (kept for the record)

1. **Framework:** Next 16 static export (recommended: home turf) or Vite+React (lighter
   toolchain, new toy)?
2. **Hosting/domain:** confirm Cloudflare Workers + is supersaiyan.me already bought/on
   Cloudflare DNS? Buy the fallback neutral domain now — any preference?
3. **Name risk appetite:** proceed under supersaiyan.me (MODERATE domain risk, worst case
   = rename later), or lead with a neutral brand + scouter concept from day one?
4. **Scan without stats:** what should a bare photo scan show — cheeky random-ish number
   with "LOW CONFIDENCE" flavour, or push users into entering at least one stat first?
5. **Power-level curve:** should an average-fit human land near canon humans (farmer=5,
   Krillin-tier hundreds) — numbers feel small but canon-true — or scale so regular users
   see satisfying thousands? (Affects the display-layer curve only.)
6. **v1 test list:** which tests make the Phase 2 cut? Proposed core: bench, squat,
   deadlift, pull-ups, push-ups, 40m/100m, vertical jump, 5k, VO2 max, RHR, plank, grip.
7. **Aesthetic:** direction set — **90s/2000s web vibe** (K, 2026-08-10). Open
   sub-question: which flavour(s) — Geocities maximalism, Y2K chrome/gloss, CRT terminal,
   anime-fansite era — and how far to push authenticity vs usability.
8. **Sex/age inputs:** collect optional sex + age for fair scoring (better numbers, tiny
   privacy surface, stays local) or keep inputs to pure performance?

---

## Decisions log

- 2026-08-09 — Project scaffolded in `clients/side-projects/`; research completed (canon,
  fitness scoring, tech/IP); plan drafted. No code yet — pending interview.
- 2026-08-10 — Migrated to own repo `kwameandco/over9000` (moved, not copied — removed
  from clients). K directive: real 90s/2000s aesthetic; remaining decisions via interview.
- 2026-08-10 — Interview complete (3 rounds, all §7 outcomes above). Headline calls:
  brand = OVER 9000; arcade-attract-mode art direction; Netlify hosting; canon power
  curve with transformation-only limit breaks; all four stat groups in v1. Build starts.
- 2026-08-10 — Phase 0 shipped + Phase 1 core shipped (attract → scan → result → export →
  hall). Stack as decided: Next 16.3 export / React 19.2 / Tailwind 4.3 / TS 7. All audio
  synthesised in-code. QA'd via Playwright on the static build; `npm run build` green.
