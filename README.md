# Ghemotoc

An app by The Magic Coffin: a writer-first platform for stories, poems and essays, for Romania and English-speaking readers, with minors (13+) as users from day one.

This repository is built with Claude Code, one user story per pull request.

- Rules for Claude Code: [CLAUDE.md](CLAUDE.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Definition of Ready and Done: [docs/definition-of-done.md](docs/definition-of-done.md)
- Stories: [docs/stories/](docs/stories/)
- Decisions: [docs/decisions.md](docs/decisions.md)
- Designs: [design/](design/) (boards, renders, pictures)
- Draft content: [content/](content/) (legal texts, safety contacts, classics)
- The starter kit's session prompts and the record of how the plan was made (once `prompts/` and `docs/history/`) moved out of the repository on 5 Nov 2026; Robert keeps them with the project's files.

## Run it locally

You need Node.js 24 (`.nvmrc`), and Docker Desktop for the local database.

```bash
npm ci                 # install exactly the packages in package-lock.json
npx supabase start     # start the local database in Docker (first time: several minutes)
npm run dev            # open the address it prints, usually http://localhost:5173
```

Checks (run all before saying a story is done):

```bash
npm run lint && npm run typecheck && npm run types:check && npm test && npx supabase test db && npm run test:e2e && npm run i18n:check
```

New here? Read [docs/code-tour.md](docs/code-tour.md) first.

Private and proprietary. All rights reserved.
