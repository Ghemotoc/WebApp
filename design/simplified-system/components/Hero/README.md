# Hero

One glass hero per page (Robert, 20 Nov 2026): the block that says what the page is for, with the page's one main button. It is the only glass that does not float.

| Page | The hero holds |
|---|---|
| Home | The date and the writing month day, "Welcome back, Lia.", what is waiting, **Keep writing chapter 8** and the writing month meter |
| Read | Featured stories (today's carousel), with Pause; it never turns while the pointer or focus is on it |
| Story page | The cover, title, pen name, meta line, the blurb, tags and **Continue chapter 14** |
| Library | Continue reading: where the member stopped, on which device and when |
| Write | How readers respond: reads, read-through, likes, comments and followers |

- `gh-hero` with `gh-glass`: `surface-glass`, blur 24px, `surface-glass-rim` and `shadow-raised`, corners `radius-card`, padding 40px (24px under 900px), on the pale mesh (README, Colour).
- `gh-hero--split` puts a second block beside the first on wide screens, as on Home, and under it on phones.
- One main button, named for the step; everything else is quiet or text.
- A meter uses the `thread` (`gh-meter`) and carries its value in words ("6,240 of 20,000 words") and in ARIA.

**What changes:** this replaces the next step card of the first proposal (archived), because today's Home keeps its welcome and writing month (Robert, 20 Nov 2026: the redesign changes the look, not the features).

**Don't:** put two heroes on a page, nest cards inside it, or add a second main button.
