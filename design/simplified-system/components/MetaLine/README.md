# MetaLine

A line of facts in the `meta` style (13px, `ink-muted`), joined by middots.

**Use it for** the facts under a title: genre, chapters, rating, "No AI", where it can be read, times, counts, how full a bookshelf is and who can see it.

- Order: what it is, how long, who it is for, anything special. "Mystery · 15 chapters · 13+ · No AI".
- The rating stays in the meta line; the full labels table moves to a Details section lower down the story page.
- Each fact is a span, so screen readers read the words; the middot is drawn by CSS.

**States open the meta line** (Robert's pick, 20 Nov 2026). A state that changes (Draft, Scheduled for 21 Nov, Published, Due tomorrow, Handed in) is the first fact, in bold `ink`: "Draft · 2,140 words · edited 2 h ago". There is no pill and no dot.
- Only a deadline keeps a colour: "Due tomorrow" in `state-warning-ink` (7.1:1 by day, 12.6:1 at night).
- Only urgent safety items take `ink-danger`.
- The word always carries the state, so colour is never the only cue.

**What changes in the code:** the information pills of the pill system ("information pills use a pastel tint with dark text of the same hue and a soft border", Definition of Done, 17 Oct 2026) become these words. Filter chips and a writer's rank are not affected.

**Don't:** turn facts or states into pills, or colour a state that is not a deadline. The only pills left are filter chips (FilterChip).
