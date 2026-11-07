# ADR 0016: Drawn avatars use DiceBear's Micah art, edited with picture tiles

- **Date:** 6 November 2026
- **Status:** Decided by Robert (6 Nov 2026, 11:03 to 11:16 UTC). Replaces ADR 0013.

## Context
ADR 0013 chose DiceBear's Open Peeps art and a builder of drop-downs. Robert didn't like the art and asked for an avatar that is fully editable, "much easier to do, not with dropdowns" (11:04). He rejected Open Peeps, Lorelei, Adventurer and Big Ears ("they are ugly", 11:06), picked Micah ("FULL cast or Close Up", 11:09), asked that every part take colour where it can ("Ideally all take colour", 11:10) and that the designer be credited "where we can and where we should" (11:16).

## Decision
- **Art:** DiceBear's Micah style (`@dicebear/micah` 9.4.3, exact version), from "Avatar Illustration System" by Micah Lanier, under **CC BY 4.0**: commercial use is allowed and the creator must be credited. The package's code is MIT; DiceBear's core stays MIT.
- **Credit:** the editor shows "Avatar art: “Avatar Illustration System” by Micah Lanier, CC BY 4.0, drawn with DiceBear." with a link to the licence, and DiceBear writes the title, creator, source and licence into every drawn SVG's metadata, so the credit travels with each avatar. The app never loads the source or licence addresses on its own (`scripts/check-third-party.ts`).
- **Close up:** every avatar is drawn zoomed in (scale 140 %, moved down 12 %), so the face reads at comment size. Robert offered "full cast or close up"; close up fits our small circles better.
- **Parts and colours:** hairstyle (8), eyebrows (4), eyes (5), mouth (8), nose (3), beard (none, beard, stubble), glasses (none, round, square), earrings (none, hoop, stud) and top (3); colours for skin (9 tones), hair (12, every hairstyle takes any colour, and a beard always matches the hair), glasses and earrings (7), top (10) and background (the six pastels). Glasses, earrings and beard start at none, so nothing assumes a gender. The sad and frowning mouths are offered because Micah's are gentle; nothing is monstrous.
- **Editor:** three tabs (Face; Hair; Glasses and earrings) of picture tiles and colour swatches, each named in words for screen readers, with no drop-downs. Each tile is the person's own avatar with that one choice changed, so they see the result before choosing. The background colour sits under the tabs whichever tab is open, and the top and its colour are no longer offered because the close-up barely shows them; the recipe still holds them so saved avatars draw the same (Robert, 7 Nov 2026).
- **Moving the old avatars:** the migration turns every saved Open Peeps recipe into the nearest Micah one (same skin, hair colour, clothes colour and background; the closest hairstyle, beard and glasses), so nobody loses their avatar. Anything that can't be read goes back to the initials.
- **Loaded when needed:** the art (about 200 KB) is fetched the first time an avatar is drawn, as before.

## Consequences
- The recipe has a new shape (`style: "micah"`), checked by `avatar_recipe_valid()`; the old shape is refused from now on.
- A Credits page listing every open-licence asset (this art, the fonts) would be a good addition later; for now the credit is under the editor and in every SVG.
- Swapping to our own doodle-style parts later still means a new `style` value and a new drawing function.
