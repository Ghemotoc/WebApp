# Deck refresh brief (17 Oct 2026, late morning)

Robert: "now you may redo all decks to be new". The design canvas is final for now, so every deck gets fresh screen images from it, and its text is brought in line with everything decided up to 17 Oct, 10:43. The decks keep The Magic Coffin branding (their own fonts and look): change pictures and wording, not the deck style.

## The decks (Slides artifacts)
| Deck | URL |
| --- | --- |
| Master deck | https://claude.ai/artifact/MziBWGSeH993ndigxe3EjZ |
| Investor deck | https://claude.ai/artifact/5qtUqDgJtAuS2PAFJSWBbV |
| Competition and programme deck | https://claude.ai/artifact/RoN8gEp3VyhXHFkaALuVVs |
| Sponsors and partners deck | https://claude.ai/artifact/KDZ7FrpmdwD322vbyuys8q |
| CTO app specification deck | https://claude.ai/artifact/D8UDhunqheXTjMUtQkHRNZ |

## Fresh screen renders (use these, don't re-render)
- Every canvas board rendered at 2x with the real fonts: /home/claude/work/revert/shots/<Board>.png (full page height; 1440 css px wide boards are 2880 px wide).
- Where each old deck image came from: /home/claude/work/render2/crops.json (deck, slide_file, old_blob, board, crop_css_1x, output_px, slide_img_box_px). Pages changed today (ads, new fonts for eyebrows, taller pages), so the old crop boxes may now cut through the middle of something. For every image, look at the full render (downscale it to view) and pick the crop that shows the same part of the screen cleanly, at the same aspect ratio as the slide's image box. Crop at 2x from the PNG with Pillow; save JPEG quality 95, subsampling 0 for screens with photos, PNG otherwise.
- What changed on the screens today: one drop-down style; ad placeholders on public pages (banners, side ads, below the reply box in threads); scroll arrows only when a row scrolls; fine lines between label rows; eyebrow labels in Cutive sentence case; music-notes doodle on the story page; Legal centre with full draft texts; safety contacts by country on the report form; neutral "isn't taking messages right now" note for adults.

## Decisions to reflect in the text (all settled; newest wins)
- App name Ghemotoc, "An app by The Magic Coffin". Romania first; the company's country (Romanian SRL or Swedish AB) is still open.
- March 2027 is web only; apps after.
- Minimum age 13; Yoti age check; parent or guardian consent under 16; 16 and 17-year-olds join without a parent.
- Messaging: adults can never message under-16s; 16 and 17-year-olds have adult messages off unless they turn them on; adults never learn anyone's age. No new-chat limit.
- Ratings All ages, 13+, 16+, 18+. Minors in fiction: abuse can be a theme; no explicit or eroticised sexual content involving anyone under 18, real or fictional; such stories are 16+ or 18+ with a content note.
- Ads: on every public page (Discover, Search, Classics, See all, story page, shared-link page, app-only page, Library, Forums, threads, spaces, profiles, chapter end), never too many (at most 2 slots a page), never personalised, "Ad" vs "Sponsored", never inside chapter text, full screen or in class spaces. Writers get NO share of ad or sponsor income.
- Classics shelf: public-domain works in Romanian and English, including plays (Caragiale, Alecsandri, Delavrancea, Shakespeare, Wilde...). In Romania and the EU a work is free 70 years after the author's death (counted from 1 January after), and translations have their own copyright.
- Schools: state high schools use class spaces free; universities and private schools pay a yearly licence; paid extras for every school; prices "[price to be set]".
- Support tickets live inside the admin site, with a ready-made external helpdesk behind it.
- Safety contacts shown by country; checked monthly.
- A Romanian lawyer reviews all legal texts before March; draft legal texts exist.
- Moderation in-house and report-based; every picture checked on upload (Sightengine, Arachnid Shield).
- Euros only. Founders 25% each, CEO casting vote, 4-year vesting (only where the deck already covers ownership). No invented statistics.

## Rules
- Follow the Slides type's instructions that come with your read of each deck. Read each slide before you change it. Keep each deck's structure and slide count roughly the same.
- Upload new images as assets of that deck and point the slide at the new asset url exactly as returned; delete nothing.
- Copy: British English, no Oxford commas, no em dashes, plain sentences.
- Report per deck: slides whose image you replaced (slide file → board and crop), slides whose text you changed (one line each), anything unsure.
