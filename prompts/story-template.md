We are working on story [STORY ID, for example S1-E3-02] only. Read CLAUDE.md, docs/architecture.md and docs/definition-of-done.md first, then the story itself in docs/stories/.

CONTEXT:
- Already merged: [dependency story IDs]
- Decisions that apply: see docs/decisions.md; anything new: [write it here]
- Platform for this story: web (March is web only)
- Designs: [board names in design/boards/, for example Story, Reader]
- Back-end pieces (architecture 1.7.3): real: [IDs]; mocked: [IDs]

STEP 1, PLAN ONLY. Don't write code yet. Give me:
1. Files you will create or change.
2. Migrations: tables, columns, indexes, RLS policies (who can select, insert, update or delete, and why).
3. A table mapping each acceptance criterion to the test(s) that prove it.
4. New i18n keys (ro and en), analytics events and moderation hooks.
5. Anything in the story that is OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build it, run every check in CLAUDE.md and check that the code follows the Readable code section of CLAUDE.md, fix failures, push your working branch (in a cloud session, the branch the session was given) and open a pull request titled "[STORY ID]: [title]", then give me:
- a summary of what changed,
- the check results,
- step-by-step instructions for me to test it by hand, written for a non-developer, with an adult, a 16 to 17 and an under-16 test account where relevant,
- the pull request description using .github/pull_request_template.md.

QUALITY CHECK, part of STEP 2: do it before you open the pull request and paste the results into the PR description.
1. A table: each acceptance criterion, the test that proves it and pass or fail. Every row must pass.
2. The Definition of Done (docs/definition-of-done.md), ticked item by item, with evidence or "not applicable" and why.
3. Screenshots of every changed screen at 390, 768 and 1440 px next to its board render. List any difference, and any place where docs/board-fixes.md or a decision overrode the board. If no screen changed, say so.
4. The Readable code section of CLAUDE.md: confirm the file headers, doc comments, step comments and the docs/code-tour.md lines are there.
5. Run every check command in CLAUDE.md again from a clean start and paste the summary.
6. Anything you couldn't do or had to stub, with the story that will finish it.
Then give me the hand-test steps STEP 2 asks for.
