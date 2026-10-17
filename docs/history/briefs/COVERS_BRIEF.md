# Brief: new drawn covers everywhere + blurred edges on side-scrolling rows (16 Oct, evening)

Canvas: https://claude.ai/artifact/PMdGAYUPHUff27xJd1tGco (Claude Design artifact). British English, no Oxford commas, no em dashes in any visible text.

Robert's comment on the website's Trending row:
> "When things are being cut off because you need to scroll either on the right or left, it should become blurred. That's looking cut like that."
> "Also, please update the cover images with the new ones we have done. Maybe there should be like a programming thing that creates automatically covers like randomly assigned but also different."

## 1. The 16 approved cover backgrounds (already uploaded as assets)
Same designs as the cover picker on NewStory.dc.html (read its `this.designs` and `cover()` if you want to see them drawn). Each SVG is a 5:8 background with no text and `preserveAspectRatio="xMidYMid slice"`, so it fills any box.

| key | asset url | kind | title colour | title box (behind title + pen name) | thin line under title |
|---|---|---|---|---|---|
| plum | /_blob/60fa675a29d1351310f32d853068f9af | plain | #FAF8F5 | none | #E6C24C |
| ink | /_blob/f0db2ceef4aba28d00d79aa0247a0496 | plain | #FAF8F5 | none | #E6C24C |
| violet | /_blob/36c514d360c56b4dbe2c9a990fce6055 | plain | #FAF8F5 | none | #E6C24C |
| gold | /_blob/91b025a34ffa73c4f7886c143b2229d4 | plain | #26142E | none | #481C5F |
| lilac | /_blob/f1d0436689691672be6a521d49b6d32c | plain | #26142E | none | #672786 |
| blush | /_blob/e6edfdb3a9348376f609edc9860c7003 | plain | #26142E | none | #481C5F |
| sky | /_blob/7f5800c35ba2931d2b6f7a813d85b93c | plain | #26142E | none | #672786 |
| sage | /_blob/393c482ccb609b02d62bb9257c1ec2da | plain | #26142E | none | #481C5F |
| paper | /_blob/7d94e9e8bc4d53e80e67434d7876f65c | plain | #26142E | none | #672786 |
| stripes | /_blob/5bf720d39651e2b57f384d33e3e04028 | pattern | #FAF8F5 | #481C5F | none |
| dots | /_blob/49525cd87927782c2ac3d4a53ebc2973 | pattern | #26142E | #FAF8F5 | none |
| grid | /_blob/18fddef6727cc64415d6f75fd94c388b | pattern | #26142E | none | none |
| waves | /_blob/b3b6a05178861fc4e9210eaaa4134c6d | pattern | #26142E | #FAF8F5 | none |
| starry | /_blob/619cfced034d4c0e597c0ed7da05dc98 | pattern | #FAF8F5 | none | none |
| doodles | /_blob/f295eb5a1f415fe44f9e39a32e58ba7e | pattern | #26142E | none | none |
| twotone | /_blob/0d7f4386c9eaec72ab74d7b8349bc99f | pattern (bottom 39% is a #481C5F band; title sits on the band) | #FAF8F5 | none | none |

Rules from the format (they fail silently otherwise):
- `url(...)` may only appear inside a `<helmet><style>` rule, never in an inline `style="..."`. So add classes to the helmet's `<style>`:
  `.tmc-cv{background-size:cover;background-position:center;background-repeat:no-repeat}`
  `.tmc-cv-plum{background-color:#481C5F;background-image:url(/_blob/60fa675a29d1351310f32d853068f9af)}` … one rule per key.
- Then a cover element gets `class="tmc-cv tmc-cv-{{s.cv}}"` (a hole inside an attribute string is fine) or a precomputed `class="{{s.cvClass}}"`; keep its layout in the inline style but REMOVE the old `background: linear-gradient(...)`/`radial-gradient(...)` from that style string (in markup or in renderVals helpers). Keep border radius, shadow and size as they were.
- Title text colour, title box and the underline come from the table. With a title box: `display:inline-flex; flex-direction:column; align-self:flex-start; padding:6px 8px; border-radius:6px; background:<box>`. Keep genre pills readable (they already sit on a white or dark pill; check contrast on light covers and use the plum pill with white text if needed).
- Remove any gold "glow" (radial-gradient with rgba(230,194,76,…)) from covers. Robert called it an ugly yellow smudge.

## 2. Automatic covers ("randomly assigned but also different")
Every story without its own picture gets one of the 16 designs automatically. Put this helper in the logic class of any screen that shows several covers, and use it instead of hand-picking:

```js
// Automatic cover (S1-E3-13): a story with no cover of its own gets one of the 16 approved designs,
// picked from its id so it never changes, and never the same design as the card just before it in a row.
autoCovers(ids) {
  var K = ['plum','ink','violet','gold','lilac','blush','sky','sage','paper','stripes','dots','grid','waves','starry','doodles','twotone'];
  var hash = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  var prev = '';
  return ids.map(function (id) {
    var k = K[hash(id) % K.length];
    if (k === prev) k = K[(K.indexOf(k) + 7) % K.length];   // neighbours never match
    prev = k;
    return k;
  });
}
```
Use a stable id per story (its slug, e.g. 'salt-mine-choir'). The same story must get the same design on every screen. To guarantee that across screens, use these fixed assignments for the canonical stories (they are what the helper should be seeded to match; if your screen's helper gives something else for these, hard-code these):

| story | cover key |
|---|---|
| The Salt Mine Choir (inkwolf) | starry |
| The Girl Who Fixed Radios (lia.writes) | waves |
| The Weather Station (lia.writes, draft) | sky |
| Small Rooms (poppyverse) | dots |
| Night Bus to Ploiești (corbu) | ink |
| The Last Tram Home (ilinca.r) | sage |
| Inside the Student Housing Waitlist (matei.writes) | grid |
| What Our Grandparents Didn’t Post (Ana Radu) | paper |
| Rivers That Moved Towns (geo.andrei) | sky |
| The Map Keeper’s Apprentice (teo_ink) | gold |
| Pride, Prejudice and Year 12 (bea.writes) | blush |
| Notes from Room 12 (kat.lungu) | lilac |
| Twelve Minutes Ahead (rares.d) | violet |
| The Clocktower Club (vlad.writes) | stripes |
| Bus Stop Poems (aurora.v) | doodles |
| Why I Read in Two Languages (dan.ilie) | twotone |
| Snow on the Valley Road (mara.p) | plum |
| The Last Cinema in Town (sofia.k) | gold |
| Lanterns on Lipscani (corbu) | violet |
Any other story: use the helper. In a row, two neighbours must not share a design: if the fixed table puts two equal ones side by side, reorder the row slightly or use the helper for the less important one.
Public-domain classics (Classics shelf) use the same system.

## 3. Blurred edges on rows that scroll sideways
Every horizontally scrolling row of cards or chips (shelves, Trending, Completed, Rising writers, genre chips, story strips) gets soft blurred edges where content is cut off, instead of a hard cut:
- Wrap the scroller in a `position: relative` box (if it isn't already) and add two overlays as siblings AFTER the scroller:
  `<div aria-hidden="true" style="position:absolute; top:0; bottom:0; left:0; width:56px; pointer-events:none; background:linear-gradient(to right, <page bg> 0%, rgba(<page bg rgb>,0) 100%); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); -webkit-mask-image:linear-gradient(to right,#000,transparent); mask-image:linear-gradient(to right,#000,transparent)"></div>` and the mirror for the right edge (`right:0`, gradients `to left`).
- Use the actual background colour behind the row (usually #FAF8F5 or #FFFFFF). Height must cover the cards only, not a heading above.
- If the row is not actually cut off (fits the width), the overlays still look fine; keep them.
- Data tables on staff screens are NOT rows of cards: leave them alone.

## How to work
1. Plain read of the artifact url first (Artifact action read, url only). Then read your files with `path`, copy them into /home/claude/work/<group>/project/ and edit there.
2. Keep the file structure: support.js line, x-dc block, `class Component extends DCLogic`, `$preview`. Don't change ids or data other parts use.
3. Publish ONLY your own files: Artifact publish with `url`, `root` = /home/claude/work/<group>, `file_path` = one of your files (full path) and `files` = the rest (canvas path → path under root). Never publish canvas.json. Other agents publish at the same time; on "haven't viewed the latest version" do a plain read of the url and publish again (check your own files weren't changed by someone else).
4. If a screen gets taller, say so and give the new $preview height (update `$preview` in the file).
5. Static check: render with Playwright if you can (the dc runtime doesn't run locally; /home/claude/work/read/tools/render.py shows how others did a static render) and look at it. Asset urls don't load locally; that's fine.

## Report back (short)
Per file: covers changed (count), scrollers given blurred edges (count), anything you couldn't do. Keep it brief.
