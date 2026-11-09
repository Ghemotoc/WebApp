# Design system page

The `/design` page: every colour (light and night, with contrast ratios), font and component on one page, to compare with the board pictures in `design/renders/`. Built by S1-E1-03.

- `DesignPage.tsx`: the page; one section component per part in `components/`.
- `registerDesignTranslations.ts`: adds the page's own text (`src/locales/<language>/design.json`) when the page loads, so production builds don't carry it.

Where it shows: always in development (`npm run dev`), and on staging when the build has `VITE_SHOW_DESIGN_PAGE=true`. Never in production (decided 17 Oct 2026). Search engines are asked not to index it.

The components themselves live in `src/components/ui/`; the tokens in `src/styles/tokens.css`. When you add a component, add a sample here too.
