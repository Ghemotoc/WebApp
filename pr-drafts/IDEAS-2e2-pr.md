<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14c IDEAS-2, a fix-up to part e (#333): "Design it in Canva" goes back to one blank cover-size design, without templates. This follows Robert's decision of 4 Nov 2026, 08:09 to 08:12. This idea has no story issue.

## What changed

- This reverts #333's merge commit. The template picker, the `template` and `penName` fields, Canva autofill in `server/canva/real.ts`, the `CANVA_TEMPLATE_*` settings, the stand-in's "Started from" line, and the related locale keys, tests and docs are gone.
- "Design it in Canva" sends the writer to Canva again, signed in with their own account. They land on a blank 1600 × 2560 design named after the story, as S1-E3-12 built it.
- Why: Canva lets an app place editable title and author text only through brand templates and autofill, and those need Canva Enterprise. Writers use their own accounts, so templates wouldn't work for most of them.
- Part d's "your new cover is here" note and part f's picture previews are untouched. The code-tour conflict was resolved so part f's section stays.
- `docs/decisions.md` has a new row for the decision. ADR 0009 has a GO-LIVE check: if Canva's API lets an app add text to an ordinary account's design by then, "Title" and "Author" boxes can be added.

## Tests

- `e2e/canva-covers.spec.ts` is back to the blank-design flow, including the arrived-cover note from part d.
- `server/canva/real.test.ts` is removed with the autofill code it tested.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 230 files, 1,451 tests passed.
- Database (`supabase test db`): 193 files, 4,482 tests passed.
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (canva-covers, story-settings): 36 passed.

## By hand

Nothing.

## Follow-ups

- At GO-LIVE, check whether Canva's design editing API now works on ordinary accounts (ADR 0009).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
