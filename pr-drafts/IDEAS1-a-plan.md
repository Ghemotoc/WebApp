# IDEAS-1a plan: reading place and comfort

Ideas IDEA-20261031-4, 6, 7 and 8 (Robert's picks, 31 Oct 2026). Branch `claude/ideas1-a-reading-comfort`.

- Migrations: `reading_font` gains `atkinson_hyperlegible` (own file); `reading_settings` gains `night_by_clock`, `night_from`, `night_until`, `reading_ruler`; `save_reading_settings()` takes four more arguments with defaults.
- No new table, no new personal data beyond two reading times on an owner-only row. RLS unchanged; test 215 adds an allowed and a denied test on `reading_settings_select_own`.
- Front end: "You are here" on the story page's chapter list (link ending `#resume`); the self-hosted Atkinson Hyperlegible font; Night by the clock (clock read once per chapter, a pick by hand wins until the next chapter); the reading ruler (lazy-loaded, aria-hidden, pointer and arrow keys).
- Tests: database 215; unit `nightByClock`, `rulerLines`; e2e `reading-comfort.spec.ts` (6 behaviour tests, 24 axe views).
- Docs: code tour, reading README.
