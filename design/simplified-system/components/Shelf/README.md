# Shelf

A row of covers on Read, in the Library and on profiles: up to 20 covers, then a View more card. Bookshelves use the same row.

**How many covers show** (Robert, 20 Nov 2026: the fade at the edge was visual overload)

| Screen | Covers in view | Moving along |
|---|---|---|
| Wide (1024px and up) | 5 whole covers | Previous and Next arrows at the top right, beside View. Each press moves one screenful. At either end the arrow dims and says so to screen readers (`aria-disabled`) |
| Tablet (600 to 1023px) | 4 whole covers | The same arrows |
| Phone | 2 whole covers and the edge of a third | A swipe; the row snaps to a cover. No arrows: they are small targets on a phone, and the edge shows there is more |

- No fade and no scroll bar. Covers take their width from the row: a fifth of the column on wide screens, less the gaps (`space-6`; `space-4` on phones).
- Heading in the `heading` style, with no eyebrow and no subline. "View 54" on the right opens See all.
- Each card: the cover, then the title (`label`, `ink-heading`) and the pen name (`meta`), written under every cover, as one link in a list item.
- Continue reading adds a `thread` progress line under each cover.
- The row never turns by itself, and the arrows scroll smoothly only when reduced motion is off.

**Don't:** fade the edges, cut a cover in half on wide screens, turn the row by itself, stack rows into grids, add a side column, or put a sponsored banner inside a row.

**Naming:** in the interface these are rows with plain headings ("Trending"), never "shelves", so "bookshelf" means one thing: the collections members make (Bookshelf).
