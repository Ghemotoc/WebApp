We are working on story S1-E1-01 (Repository, environments and CI skeleton) only.
This is the first session: the repository holds only the starter kit (CLAUDE.md, docs/, design/, prompts/). There is no app code yet.

Read first: CLAUDE.md, docs/architecture.md (sections 1.5, 1.7, 1.11 and 1.12), docs/definition-of-done.md, and the story S1-E1-01 in docs/stories/.

What I want from this session:
- A React + Vite + TypeScript (strict) app skeleton with Tailwind, shadcn/ui, React Router, TanStack Query and i18next (ro and en), and an empty home route that says "Ghemotoc" in both languages.
- The Supabase CLI as a dev dependency, `supabase init`, and the npm scripts CLAUDE.md lists (lint, typecheck, types:gen, types:check, test, test:e2e, i18n:check), each working, even if some only run an empty suite for now.
- GitHub Actions:
  1. On every pull request: lint, typecheck, unit tests, database tests against a local Supabase (`supabase db start`), the i18n key check and a Playwright + axe smoke test of the home page. A failing check blocks the merge.
  2. Database changes: Supabase's GitHub integration is connected to the staging project and applies supabase/migrations when main changes. Don't add a GitHub Actions job that also pushes migrations; make sure the supabase/ folder and config work with that integration.
  3. The web deploy step exists but is switched off: the hosting provider is OPEN (Q38).
- A .claude/settings.json SessionStart hook that runs `npm ci` only when package-lock.json changed, so cloud sessions start ready.
- docs/runbooks/README.md with one line per runbook still to write.

Production deploys and tagged releases: write the workflow but leave it disabled until a production project exists.

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. The files you will create.
2. A table mapping each acceptance criterion of S1-E1-01 to the check or test that proves it.
3. Anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check, fix failures, push the branch story/S1-E1-01-repo-ci and give me:
- a summary of what changed and the check results,
- step-by-step instructions for me, a non-developer on a Mac, to run the app locally and see it,
- the pull request description using .github/pull_request_template.md.
