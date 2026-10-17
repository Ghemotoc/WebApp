We are working on story S1-E1-01 (Repository, environments and CI skeleton) only.
This is the first session: the repository holds only the starter kit (CLAUDE.md, docs/, design/, prompts/). There is no app code yet.

Read first: CLAUDE.md, docs/architecture.md (sections 1.5, 1.7, 1.11 and 1.12), docs/definition-of-done.md, and the story S1-E1-01 in docs/stories/.

What I want from this session:
- A React + Vite + TypeScript (strict) app skeleton with Tailwind, shadcn/ui, React Router, TanStack Query and i18next (ro and en), and an empty home route that shows the product name in both languages (from the brand config below, never typed in a component).
- One brand config: the product name, the site domain, the support and contact email addresses and the social handle live only in src/config/brand.ts (built from VITE_ variables) on the front end, and in settings or Edge Function secrets on the back end. "Ghemotoc" is a working name until the name and domain are bought (decided 17 Oct 2026, 12:47). Today's values: name Ghemotoc, site ghemotoc.themagiccoffin.com (once hosting is chosen), contact and support address hello@themagiccoffin.com (decided 17 Oct 2026, 12:50). Add a test that fails if the literal "Ghemotoc" or "ghemotoc.com" appears in src/ or supabase/ outside that config and the locale files.
- The Supabase CLI as a dev dependency, `supabase init`, and the npm scripts CLAUDE.md lists (lint, typecheck, types:gen, types:check, test, test:e2e, i18n:check), each working, even if some only run an empty suite for now.
- GitHub Actions:
  1. On every pull request: lint, typecheck, unit tests, database tests against a local Supabase (`supabase db start`), the i18n key check and a Playwright + axe smoke test of the home page. A failing check blocks the merge.
  2. Database changes: Supabase's GitHub integration is connected to the staging project and applies supabase/migrations when main changes. Don't add a GitHub Actions job that also pushes migrations; make sure the supabase/ folder and config work with that integration.
  3. The web deploy step targets Cloudflare Pages (decided 17 Oct 2026, 12:57) and stays switched off until Robert connects the Cloudflare project to the repository.
- A SessionStart hook that runs `npm ci` only when package-lock.json changed, so cloud sessions start ready. Merge it into the existing .claude/settings.json and keep its deny rules.
- docs/runbooks/README.md with one line per runbook still to write.
- docs/code-tour.md, written for a junior developer: where the app starts, how a click travels from a screen to a database table and back, where things live (src/features, src/lib, supabase/migrations, supabase/functions, supabase/tests, e2e, docs) and a "start here" reading order. Every later story updates it (Definition of Done, Readable code).

Production deploys and tagged releases: write the workflow but leave it disabled until a production project exists.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. The files you will create.
2. A table mapping each acceptance criterion of S1-E1-01 to the check or test that proves it (including the brand config and its literal-name test), plus one row for docs/code-tour.md (it exists and covers the four parts above).
3. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check, fix failures, push your working branch (in a cloud session, the branch the session was given) and open the pull request titled "S1-E1-01: Repository, environments and CI skeleton", then give me:
- a summary of what changed and the check results,
- step-by-step instructions for me, a non-developer on a Mac, to run the app locally and see it,
- the pull request description using .github/pull_request_template.md.

QUALITY CHECK, part of STEP 2: do it before you open the pull request and paste the results into the PR description.
1. A table: each acceptance criterion, the test that proves it and pass or fail. Every row must pass.
2. The Definition of Done (docs/definition-of-done.md), ticked item by item, with evidence or "not applicable" and why.
3. Screenshots of every changed screen at 390, 768 and 1440 px next to its board render. List any difference, and any place where docs/board-fixes.md or a decision overrode the board. If no screen changed, say so.
4. The Readable code section of CLAUDE.md: confirm the file headers, doc comments, step comments and the docs/code-tour.md lines are there.
5. Run every check command in CLAUDE.md again from a clean start and paste the summary.
6. Anything you couldn't do or had to stub, with the story that will finish it.
Then give me the hand-test steps STEP 2 asks for.
