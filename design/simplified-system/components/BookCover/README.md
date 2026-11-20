# BookCover

A story's cover, drawn as a book: a flat 2:3 frame with `radius-book` corners (4px), with no spine shade (Robert, 20 Nov 2026).

**Five kinds** (Robert, 20 Nov 2026)

| Kind | What it is | Who picks it |
|---|---|---|
| Label | One of the app's patterns as the cloth of a hardback, with a paper label near the top, centred between the two edges: the full title, a short rule in the accent and the pen name | Every automatic cover; writers can pick it too |
| Big title | One flat colour, the title set large at the top, a short rule, the pen name at the foot | Writers |
| Initial | One big letter in the accent, cropped by the edge, with the words above it | Writers |
| Picture | A picture fills the cover and the label sits on top of it | Writers, and staff for classics |
| Custom | The writer's own whole cover: no label and none of our writing | Writers |

- **Automatic covers** are Label covers. The pattern and the accent are picked from the story's ID, so a cover never changes. One label in one place on every automatic cover turns a row into a series, as one fixed frame does for Penguin's classics (Classic Penguin, p. 41).
- **The label is centred** between the left and right edges at every size (Robert, 20 Nov 2026): it keeps its width, 80.8% of the cover, with 9.6% on each side. Big title and Initial keep equal side margins too.
- **Title font:** the covers we draw (Label, Big title, Initial and the label on a Picture) set the title in Literata 600. Writers can pick another of the app's fonts when they set up a cover: Funnel Display, Inter or Playwrite Cuba (Robert, 20 Nov 2026). The size rule runs with the picked font's own measured widths (`word_widths_fonts.json`); pen names stay in Inter.
- **Hairline edge:** a 1px line just inside every cover (`--cover-edge`: ink at 16% by day, white at 16% at night), so a pale cover keeps its shape on the pale page and a dark cover on the night page (20 Nov 2026). No shadow.
- **Words sit on solid ground:** the paper label, or a flat colour, with dark or light words by contrast. A picture never carries our words without the label.
- **The title is shown in full:** it steps down with length (×0.85 from 19 characters, ×0.72 from 29, ×0.62 from 41), grows with the cover, never goes below 11px and never breaks a word. Sizes inside a cover are in `cqi`, so a cover looks the same at every size; below 100px a cover is a miniature: the title only, at the cover's own scale (smaller than 11px if need be), because a small cover always has its title written beside it, so no word is ever clipped.
- **Pictures under the label:** classics use art that is out of copyright, such as John Leech's 1843 drawings for A Christmas Carol, and staff record where each picture came from; never a picture taken from another publisher's cover. Writers use a picture they have the rights to, with no words in it and no real people, and it gets the same checks as any other picture.
- **Custom covers** get the same checks as any other picture.
- Cover colours come from the cover palette (`cover-plum` … `cover-paper`) and stay the same in both themes: covers are objects.
- **On cards** the title and pen name are written under every cover (Shelf), whatever the cover shows, so every story is named in text and a custom cover with small lettering still reads.

**What changes in the code:** today the app draws 19 designs (9 plain colours and 10 patterns, `src/components/covers/coverDesigns.ts`) and gives a story without a cover one of the first 7 patterns, picked from its ID. Label keeps that system and puts the words on a label; Big title, Initial and the picture under the label are new choices for writers; uploaded covers stay as they are.

**Don't:** round covers like app tiles, lay a title pill over the art, set our words straight on a picture, or take a picture from another publisher's cover.
