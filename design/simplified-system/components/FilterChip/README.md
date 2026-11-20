# FilterChip

Filter chips switch a filter on or off, on Read, See all and search. They are the only pills left: states are words in the meta line (MetaLine).

- 36px tall inside a 44px target, `radius-full`, `surface-solid` with a `line-control` border (3:1 or more).
- On: `action-selected` with a check icon and `aria-pressed="true"`, so colour is never the only cue.
- A group of chips sits in a `role="group"` named for what it filters ("Filter by genre").

**Don't:** use a chip for a state, a genre label on a story, a rating, "No AI" or tags (MetaLine and text links), or for the title on a cover.
