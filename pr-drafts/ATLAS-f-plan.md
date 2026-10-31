# ATLAS-f plan: the storyline (S1-E17-19 to S1-E17-22)

- Migration `20261104150001_s1_e17_19_storyline.sql`: `story_events` (RLS, `story_events_select_own`, grants), `story_storyline()`, `place_chapter_on_board()` (asks first when published order changes), `add_chapter_to_act()`, the event functions.
- pgTAP `195-storyline`; 021 lists `story_events`.
- Front end: `/plan/s/:slug/storyline` with a view toggle (Board, Timeline, POV lanes; remembered on the device). Board columns per act plus "No act"; cards with label, title, POV, status, Published, words and date; move buttons and drag; confirmation dialog; Add chapter per act. Timeline with events and dated chapters, undated listed apart. Lanes as a table.
- Plan numbering counts only chapters of type "chapter" (board and writing view list).
- e2e `atlas-storyline.spec.ts`; docs.
