# Ad placements brief (17 Oct 2026, 08:32, Robert)

Robert, in chat: "I don't want there to be too many advertisements, but enough advertisements to show on every public page."
His canvas comments (all on 17 Oct):
- Search (3.2): "One portrait advertisement here can go, or on different pages."
- Discover (3.1): "There could be a big advertisement banner here too." (anchored on the slim sponsor strip / shelf area)
- Forums (5.1): "Advertisements can go in here as well." (anchored on the "Writing craft, 4 forums" group)
- Forum thread (5.2): "There could be advertisements between messages on forums as well. Again, neutral advertisements."
- A user space (5.3): "Wherever you find some space on public pages, can you please add placeholders for like banners or so on for advertisements? They should look tasteful."

## What stays decided (do not change)
- Ads are contextual or from ad networks that never personalise: the same for everyone, including under-18s. "Ad" label for ad-network ads, "Sponsored" + sponsor name for direct sponsors. "Why this ad?" link.
- Never inside the text of a chapter, never full screen, never a pop-up, never auto-playing sound or video.
- NEVER any ad, sponsored item or sponsor credit in class spaces.
- Staff block categories unsuitable for minors (alcohol, gambling, tobacco, dating, weight loss and similar).

## The placement rule (lead's proposal for Robert, apply it on the boards)
Public pages = pages people browse to find and read public content: Discover, Search, Classics, See all, Story page, shared-link Teaser, Forums, Forum thread, public user Spaces, writer Profile (and the chapter reader, which already has its chapter-end banner).
No ads on: sign-up, log in, age check, parent consent, onboarding, Library (personal), writer tools (dashboard, new story, editor, chapters), Messages, Notifications, Settings, reporting and appeals, legal and help pages, error pages, staff pages, class spaces. The marketing website home page stays ad-free (open question for Robert).

"Not too many":
- At most 2 ad slots on a page: one wide banner and one smaller slot (a card in a list, or a portrait in the side column, or an in-thread ad).
- Never more than one ad in view at a time on a 1440 x 900 screen; never two ads next to each other or one straight after another.
- Never the first thing on a page: always below the page heading and the first row of content.
- Forum threads: the first in-thread ad after the 3rd reply, then at most one every 10 replies.
- Lists and grids: at most one ad card per 12 items, never in the first position.

Formats (tasteful placeholders, all in the pastel palette):
- **Wide banner**: full content width, 120 px tall on desktop (max 970 px wide, centred), 100 px on phones. Placeholder: background #F4F0EC, 1 px dashed #B9A9C2 edge, radius 20px; the AD pill top-left (reuse the exact existing AD pill markup from Discover line ~281: 24 px tall, neutral outline, letter-spacing 0.12em); a centred muted line "[Advertiser] banner · 970 × 120"; a small "Why this ad?" link bottom-right (#672786, 13 px, underlined, 44 px tap height via padding). `<aside aria-label="Advertisement">`.
- **Portrait** (desktop side column only, ≥1200 px; hidden on narrower screens with a helmet class like `.tmc-ad-portrait{display:block}@media (max-width:1199px){.tmc-ad-portrait{display:none}}`): 300 x 600, same styling, line "[Advertiser] · 300 × 600". On Search it sits in a right side column beside the results (make the results area `flex: 999 1 560px; min-width: 0` and the ad column `flex: 0 0 300px`, wrapping).
- **In-list card**: same size as a story card in that list, same styling, "Sponsored" or "Ad" pill.
- **In-thread ad** (Thread): a slim card between two posts, the width of a post, 110 px tall, same styling, labelled AD, clearly not a post (no avatar, no reply button).
Use "Sponsored" pill (existing neutral SPONSORED markup) only where it is a direct sponsor example; otherwise AD.

## Boards and what to add
- **Discover**: one big wide banner (Robert's comment) after the first shelf, replacing nothing else; keep the existing sponsored card and the existing bottom "Ad" aside only if the page stays at 2 slots (wide banner + sponsored card): if the existing bottom AD aside makes it 3, convert the bottom aside INTO the wide banner position (move it up) rather than adding a third.
- **Search**: one portrait ad in a right side column beside the results.
- **Classics** and **See all**: one wide banner after the first row/shelf of the grid.
- **Story** page: one wide banner below the chapter list (never above "Start reading").
- **Teaser** (shared link page, visitors without an account): one wide banner below the sign-up call to action, not above the first chapter preview.
- **Forums**: one wide banner between two forum groups (Robert anchored "Writing craft").
- **Thread**: in-thread ads per the rule (after the 3rd reply; the board probably shows fewer than 13 replies, so one ad).
- **Space** (public user space): one wide banner between posts or below the pinned post. If the board shows an under-16 space, ads are still allowed (same non-personalised ads); add nothing in ClassSpace.
- **Profile**: one wide banner below the writer's stories.
- **AdFormats** (7.5): add the "Wide banner", "Portrait (desktop)" and "Between forum replies" formats to the format list, and add a short "How many ads" card with the rule above in plain words. Keep the existing four rules band. Update the page so it says ad-network ads are non-personalised for everyone (already) and that class spaces never show ads.

## House rules
- Read the canvas fresh (plain read, url only), then read your boards with `path` + `out_dir` into /home/claude/work/ads/. Publish only your boards with `root` /home/claude/work/ads, never canvas.json.
- Keep each file's skeleton (support.js line, `<x-dc>`, script class, `$preview`). Holes are dotted lookups only. No `data:` URIs. Close every element, quote every attribute. No `<sc-for>` directly inside `<table>`, `<tbody>` or `<tr>` (the parser drops it).
- Validate: `python3 /home/claude/work/p3/tools/validate.py <files>` (balance + script compile).
- Doodles: no ad may cover or sit under a doodle; if a doodle is in the way, move the doodle to free space nearby (`data-doodle` attributes stay). No doodles on the chapter reader or reporting screens.
- Responsive: the wide banner is fluid (`width: 100%; max-width: 970px; margin-inline: auto; box-sizing: border-box`), the portrait hides under 1200 px. Nothing may cause horizontal scroll at 390 px.
- Update `$preview` heights to the full new content height and report them (the lead resizes frames in canvas.json).
- Pills: use the existing pill system (/home/claude/demo/_PILLS_BRIEF.md). Selects: every select already uses the shared `tmc-sel` wrapper; keep it.
- British English, no Oxford commas, no em dashes.
- You may render to check with `python3 /home/claude/work/render2/render.py --canvas-dir /home/claude/work/ads --out /home/claude/work/ads/shots <Board>.dc.html` and Read the PNG (downscale first).
- Report: boards changed, the new heights, anything you could not place under the rule.
