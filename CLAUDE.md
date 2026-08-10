# over9000 — Claude Code instructions

Own-brand side project (not client work). Read `README.md` for the concept and
`docs/PLAN.md` before writing any code — the plan is the source of truth for scope,
stack, and the decisions log. Research backing it: `docs/RESEARCH.md`.

## Rules for this repo

- **Client-side only.** No backend, no database, no user accounts. Photos never
  leave the browser. Any feature that requires a server (beyond the optional
  parameterised OG-image edge worker in the plan) must be flagged to K first.
- **No Dragon Ball assets.** All scouter/HUD artwork is original, scouter-inspired
  vector/CSS work. No character images, no traced sprites, no official logos, no
  audio rips (synthesise our own beep). Full IP guardrails: `docs/PLAN.md` §4 and
  `docs/RESEARCH.md` §3. Keep the brand name swappable in one config module.
- **Non-commercial, always.** No ads, no merch, no paid tier — money is the single
  biggest IP-risk multiplier. Footer disclaimer on every page.
- **Aesthetic: deliberate 90s/2000s web vibe** (K directive, 2026-08-10 — exact
  flavour recorded in the PLAN decisions log). Retro is the design system, not a
  gimmick layer; but keep modern non-negotiables: responsive, accessible,
  `prefers-reduced-motion` respected, real performance.
- **Merge policy:** main is the trunk; nothing deploys automatically until a deploy
  pipeline is explicitly set up (recorded in PLAN when it happens). Direct commits
  to main are fine for now; use branches when a change is experimental.
- Keep `docs/PLAN.md` current: tick phases as they land, log decisions with dates.
