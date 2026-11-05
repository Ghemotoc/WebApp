# ADR 0013: Drawn avatars use DiceBear's Open Peeps art, drawn in the browser

- **Date:** 3 November 2026
- **Status:** Proposed by the builder (ADMIN-2g). Robert asked for "a local open-source library such as DiceBear, with a style whose art licence allows commercial use" and for the licence to be recorded here (bundle-12 brief, section 7, 2 Nov 2026, 08:36).

## Context
Avatars can no longer be uploaded: they are built with the avatar builder or are the initials (Robert, 2 Nov 2026, 08:41 to 08:50). The builder saves a small recipe on the profile (`profiles.avatar_recipe`) and the browser draws it as SVG. The brief asks for a full range of skin tones, no gendered default, no free text, a live preview, "Surprise me" and undo, and says our own doodle-style parts can replace the art later.

## Decision
- **Library:** DiceBear 9.4.3 (`@dicebear/core`, code MIT), installed from npm and bundled with the app. It runs only in the browser and loads nothing from any other site.
- **Art:** the Open Peeps style (`@dicebear/open-peeps`), designed by Pablo Stanley, under **CC0 1.0** (public domain dedication): commercial use is allowed and no attribution is required. The package's code is MIT. The SVG DiceBear makes names the source, the designer and the licence in its metadata; those links are never loaded (`scripts/check-third-party.ts`).
- **Why Open Peeps:** CC0, and the widest range of hair and head coverings (afro, bantu knots, cornrows, locs, twists, hijab, turban, grey hair, shaved, no hair), with skin tone, hair colour, facial hair, glasses and clothes colour. Eyes and mouth come together as one "expression".
- **Rejected:** Lorelei (CC0, but a head only, with no clothes); Micah and Personas (CC BY 4.0, which asks for credit with every use); Avataaars (its own "free for personal and commercial use" terms, not an open licence).
- **What we offer:** the choices in `src/features/avatars/lib/avatarOptions.ts`: nine skin tones from the lightest to the deepest, every head except the bear hat, twelve hair colours, 21 friendly expressions (angry, scared and monstrous ones left out), facial hair and accessories that default to none, ten clothes colours and the six pastel backgrounds of the design tokens.
- **Loaded when needed:** the art (about 260 KB) is a separate file the browser fetches the first time an avatar is drawn, so pages without one, such as the chapter reader, never download it.

## Consequences
- No upload, so no picture check, no moderation of avatars and nothing personal beyond the look someone chose; the recipe is in Download my data.
- The database accepts only a recipe of the known shape (hex colours and plain part names, `avatar_recipe_valid()`), so a recipe can't carry markup into the SVG.
- Swapping the art for our own doodle-style parts later means a new `style` value in the recipe and a new drawing function; saved recipes keep drawing with the old art until then.
