# TOOL-2: Doodles, last classic and demo content in parts

Branch: `claude/beautiful-rubin-amp8k6`. Open after SAFE-1 merges on 1 Nov, as a draft first, then ready once the checks pass after rebasing on main. When it opens, close Ghemotoc/WebApp#181 with "Included in <this PR>".

---

## Story
Design and tooling work, not a numbered story: Lane B's three parked branches put into one pull request (CTO, 24 Oct 2026). There is no story issue to close. It includes Ghemotoc/WebApp#181, which will be closed. Demo content 2a with 19 classics is already on main (Ghemotoc/WebApp#188).

## What changed

### 1. Doodles take their colours from the tokens (was #181; Lane B, Robert, 23 Oct 2026)
- **The 98 doodles in `design/assets/` no longer hold a fixed colour.** Every fill is written `style="fill:var(--doodle-ink, #2a0e33)"`: the token when the SVG is drawn inline (so it follows night mode), and today's colour as the fallback through `<img>`. Light mode is pixel-identical: 114 of 114 renders are byte-equal to the originals.
- **Nine `--doodle-*` tokens** are in `src/styles/tokens.css` (light and night) in their own labelled "Lane B" block. They are separate from `--primary` and `--gold`, so retuning a button never recolours a drawing. The night values were signed off by the CTO for Robert on 24 Oct.
- **`scripts/doodle-tokens.ts`:** `npm run doodles:tokens` rewrites new doodles, and `npm run doodles:check` (run by CI on every pull request) fails on any raw hex except the token's own fallback. The 16 drawn cover backgrounds keep their colours by design (S1-E1-03) and are skipped.
- **`/design` gets a Doodles section** with three samples in light and night, plus "Show all the doodles", which loads the full sheet of 98 as a separate chunk only when asked. This keeps `/design` light: the 2.3 MB chunk had made its axe check flaky. Text is in ro and en.
- Sign-off sheets are in `design/renders/doodles/`. The flow is explained in `docs/code-tour.md` (labelled block), `design/assets/README.md` and the design-system README.

### 2. The last classic: Capra cu trei iezi (20 of 20)
- Ion Creangă, from Wikisource revision 138620, source edition 1875, CC BY-SA 4.0: `content/classics/texts/classic-01-capra-cu-trei-iezi.md`.
- **Ratings (Robert, 24 Oct 2026):** Capra cu trei iezi and Neghiniță are both **All ages**. Neghiniță was 13+ in #188's content.
- The years for Sara pe deal, Balada unui greier mic and Neghiniță stay blank: Wikisource refused the lookups, and blank is accepted (CTO, 24 Oct 2026).

### 3. Demo content in parts for the Supabase SQL Editor
- The SQL Editor refused the single 2.5 MB top-up (CTO, 24 Oct). So `npm run demo:build` now also writes it as **7 parts**, `supabase/staging-topups/demo-content-2a/part-01.sql` to `part-07.sql`; the largest is 448,019 bytes, under the 450,000 cap.
- The generator splits only at statement boundaries. Each part has its own begin/commit and the personas guard. Part 01 holds the settings and accounts, and part 07 ends with the check query.
- **The single file is unchanged as a format**, and the parts are rebuilt from the same source, so they include Capra cu trei iezi and Neghiniță's new rating.
- Unit tests are in `scripts/demo-content-parts.test.ts`. `npm run demo:compare-parts` proves on a fresh local database that the parts and the single file give the same rows. `supabase/staging-topups/README.md` gives the run order.

## By hand (staging)
- On 24 Oct the CTO loads `part-01.sql` to `part-07.sql` from this branch onto staging, in order, in the SQL Editor; staging had no demo content before. Each part is safe to run twice. After a merge, nothing else needs to run unless the parts changed.

## Acceptance criteria and tests
| Criterion | Test |
| --- | --- |
| Every fixed doodle colour becomes its token; an unknown colour fails and names the file | `scripts/doodle-tokens.test.ts` |
| Light mode pixel-identical | 114 of 114 renders byte-equal (Lane B, #181) |
| CI fails on a raw hex under design/assets | `npm run doodles:check` in `ci.yml` |
| Covers keep their colours | `scripts/doodle-tokens.test.ts` ("skips the covers", 16 skipped) |
| Samples render in light and night; the full sheet loads only when asked | `src/features/design-system/components/DoodleSection.test.tsx`, `e2e/doodles.spec.ts` |
| Capra cu trei iezi and Neghiniță are All ages | front matter `rating: all_ages`; `demo:build` checks ratings (`scripts/build-demo-content.test.ts`) |
| Every part is under 450 KB, splits at statement boundaries and runs on its own | `scripts/demo-content-parts.test.ts` |
| The parts add exactly what the single file adds, and a second run adds nothing | `npm run demo:compare-parts` |

## Checks (clean start: packages reinstalled, Supabase stopped and started, Node 24)
```
npm run demo:compare-parts
single file:      test_accounts 22, demo_writers 6, settings 2, stories 56, chapters 137, story_tags 261
7 parts:          the same, and the same chapter, story and tag checksums
parts run twice:  no change
```
On `fe3b826` (`claude/beautiful-rubin-amp8k6`):
```
npm ci                pass
npm run lint          pass
npm run typecheck     pass
npm run types:check   pass
npm test              pass
npx supabase test db  pass
npm run i18n:check    pass
npm run doodles:check Checked 98 doodles (0 changed, 16 cover backgrounds left alone): 0 problem(s)
npm run build && npm run scan:bundle   no service role key or secret API key in dist/
npm run test:e2e #1   397 passed, 1 skipped, 5 failed, 35 did not run; 16.9 min
npm run test:e2e #2   397 passed, 1 skipped, 5 failed (the same 5), 35 did not run; 17.1 min
```
The 5 failures are the tests that read email from Mailpit, which this cloud container can't download (the network policy blocks the registry). The 35 "did not run" are the later tests in the same serial files. CI has Mailpit. This branch doesn't include TOOL-1's flaky-test fixes; it gets them when it is rebased on main after TOOL-1 merges. Run the checks again then.

## Definition of Done
- [ ] CI green
- [x] RLS allowed and denied tests (n/a: no table or policy changed)
- [x] ro and en strings (`design.json`)
- [x] axe clean and keyboard checked (the /design views at 390, 768 and 1440 px, light and night)
- [x] No personal data (demo personas only; no real names)
- [x] Reportable and blockable (n/a)
- [x] Docs updated: code tour, `design/assets/README.md`, design-system README, `content/classics/texts/README.md`, `supabase/staging-topups/README.md`
- [ ] Tested on staging by a person: the demo parts are loaded by the CTO; for the doodles, use #181's hand test (`/design` › Doodles › "Show all the doodles", then switch the theme)

## Follow-ups
- **Lane A's `Doodle` component** (S1-E3-01) shows 19 copies from `src/assets/doodles/` through `<img>`. Those don't follow night mode yet: run `scripts/doodle-tokens.ts` on that folder and draw them inline. Not widened into this pull request.
- **The Wikisource converter** Lane B used, including its fix that keeps verse lines together, isn't in the repository. Only its output is. Worth committing under `scripts/` before the English classics.
- **Demo content part 2b** (likes, comments and follows) waits for the S1-E6 stories (TOOL-3).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01HWhmxZsrpxwyzru4NSNAjj
