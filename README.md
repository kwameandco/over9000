# over9000

> Repo home of the scouter project (working product name/domain under discussion —
> previously incubated as "supersaiyan.me" in `kwameandco/clients/side-projects/`,
> migrated here 2026-08-10).

## What it is

A free, no-account web toy built on the Dragon Ball Z **scouter** motif: point the
scouter at yourself and find out your power level. Deliberate **90s/2000s web
aesthetic** throughout.

The core loop:

1. **Scan** — upload a photo of yourself; the site renders a scouter-style HUD over
   it (reticle, scanning sweep, numeric readout) and "detects" your power level.
2. **Stats** — enter real fitness/strength test results (bench press, 40m dash,
   VO2 max, vertical jump, …). Choose which stats display on the scan.
3. **Customise** — scouter style + lens colour, HUD layout, which params show.
4. **Transform** — apply a transformation (Kaio-ken, Super Saiyan, …) and watch the
   multipliers recalculate your theoretical stats: bench press ×50, 40m dash time
   collapsing, etc. Warning/calculating animations; a **shatter effect** when a
   reading breaks the scouter's limits.
5. **Share** — download the generated image (client-side render, nothing uploaded).

Later: a "real" battle power formula (more stats = more accurate), and mini
games/tests (reaction speed etc.) that feed stats directly.

## Hard constraints

- **No accounts.** Zero GDPR surface: photos are processed entirely in-browser and
  never uploaded; stats persist locally (localStorage) if the user opts to save.
- Near-zero hosting cost, zero maintenance: fully static deploy.
- Original scouter-*inspired* artwork only — no ripped Dragon Ball assets
  (see `docs/RESEARCH.md` § IP for the risk assessment).

## Docs

- `docs/PLAN.md` — scope, tech stack decision, phased build plan, decisions log
- `docs/RESEARCH.md` — scouter/multiplier canon, fitness scoring standards, prior
  art, tech + IP research (with sources)
- `CLAUDE.md` — working rules for sessions in this repo
