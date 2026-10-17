# Doodle placement brief (16 Oct 2026, evening)

Canvas: https://claude.ai/artifact/PMdGAYUPHUff27xJd1tGco (a Claude Design artifact). Robert said:
- "With the doodles, I like them very much, but you can play with the sizes, you can make them bigger, smaller up to you, and put them all over the place."
- "Also, we should be using doodles wherever there's an icon. Except for arrows. Or anywhere where they need to be accessibility friendly."

All asset urls and the rules are in /home/claude/demo/_DOODLE_ASSETS.md. Read it fully first. Use the urls exactly as written (they start with /_blob/...).

## How to work on the canvas
1. Read the artifact first with a plain read (Artifact action "read", url only, no path). Then read each of YOUR files with action "read" and `path` (e.g. "project/Reader.dc.html"); the result says where the file was saved. Copy it into /home/claude/work/<yourgroup>/ and edit there.
2. Keep the file structure intact: the support.js line, the x-dc block, `class Component extends DCLogic { renderVals() }` and `$preview`. Don't change ids or data the logic uses. Look at how a doodle is already placed on Website-Home.dc.html or Discover.dc.html if you need an example of the markup (read it, don't edit it unless it's yours).
3. Publish ONLY your own files with Artifact publish: `url` = the canvas url, `files` = {"project/X.dc.html": "/home/claude/work/<group>/X.dc.html", ...}. Never publish canvas.json, index.html or other groups' files. No `file_path` for the page. If the publish is refused with "haven't viewed the latest version", do a plain read of the url (no path) and publish again. Other agents publish to the same artifact at the same time, so a refusal is normal; just re-read and retry.
4. If a screen's content gets taller, update its `$preview` height to match and report the new height. Prefer absolute positioning so heights don't change.

## What to do on every screen
A. **Swap icons for doodle icons** following the rules in _DOODLE_ASSETS.md (nav bell, search, write, settings, home, library, profile; card and section icons; feature lists; stats; empty states; badges that are pictures, not status). Keep as standard icons: arrows and chevrons, close ×, ticks/checks in controls, plus/minus, form-field icons (password eye in a field, dropdown caret), error/warning/info/success status icons, anything under 18 px. If an icon was an emoji used as an icon (📚 ✍️ 🔔 etc.), swap it for the doodle icon too. Icon-only buttons keep an aria-label.
B. **Scatter decorative doodles** in varied sizes (40 to 260 px), slightly rotated, in margins, empty corners, beside headings, peeking from card edges, in hero areas and empty states. 4 to 10 per screen, more where there's room (website, social posts, onboarding, certificates), fewer on dense staff/admin tables (2 to 4, small, in headers or empty corners). Pick doodles that fit the content (books, pens, quill, typewriter, lantern, cat, owl, coffee, leaves...). On the Discover screen keep its jack-o'-lantern. Never cover text, controls or the chapter reading column. `alt="" aria-hidden="true"` and `pointer-events:none` on decorative ones.
C. Keep phone-width screens tidy: on narrow boards use smaller doodles (40 to 120 px) and keep them inside the frame.

## Look check
After editing, render each of your files to PNG with Playwright (Chromium is pre-installed; the dc runtime may not run locally, so if the file doesn't render standalone, at least check the markup is valid and balanced with a quick HTML parse) and look at it with Read if it renders. Fix anything overlapping text.

## Report back (short)
- per file: icons swapped (count), decorative doodles added (count), new $preview height if changed
- which icons you kept standard and why (one line)
- any publish problems
