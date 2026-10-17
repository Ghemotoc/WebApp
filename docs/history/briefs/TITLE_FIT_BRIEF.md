# Brief: the full story title must always fit on a cover (Robert, 16 Oct, 20:52)

Canvas: https://claude.ai/artifact/PMdGAYUPHUff27xJd1tGco. The app is now called Ghemotoc (already swapped in on the canvas).

Robert: "please make sure that in the covers the full title fits".

On every drawn story cover (big covers, shelf cards, thumbnails, hero wall, link previews, picker tiles and previews), the WHOLE title must be visible: no ellipsis, no line-clamp, no `white-space: nowrap`, no text cut by `overflow: hidden`, no title running past the cover edge or behind the genre pill. Long titles to test against: "What Our Grandparents Didn’t Post", "Inside the Student Housing Waitlist", "The Map Keeper’s Apprentice", "Pride, Prejudice and Year 12", "Why I Read in Two Languages".

How:
- Let titles wrap (`overflow-wrap: anywhere` only as a last resort; prefer normal word wrapping), and pick the font size from the title's length in renderVals, e.g. a helper `titleSize(title, base)` that steps down: up to 18 characters → base; 19 to 28 → base × 0.85; 29 to 40 → base × 0.72; longer → base × 0.62, with a floor of 11px on the smallest thumbnails. Keep line-height about 1.05.
- Very small thumbnails (under about 60px wide): if the title can't be readable there, it's fine to show no title on the thumbnail itself, as long as the full title sits right next to it as text (most lists already do this). Don't invent a cut-off version.
- Keep the pen name visible too, or move it below the cover if space is the problem.
- Title boxes (on the stripes, dots and waves designs) must grow with the title, not clip it.
- Don't change the cover designs, colours or anything else.

Check by rendering: a static Playwright render is enough. /home/claude/work/cvA/tools has the stand-in renderer an earlier agent used (it runs the page logic). Look at each cover with long titles at 1440 and 390 wide.

Working: plain read of the artifact url first (Artifact action read, url only), then read your files with `path` into /home/claude/work/<group>/project/ and edit there. Keep the support.js line, the x-dc block, `class Component extends DCLogic` and `$preview`. Publish ONLY your files (url, root=/home/claude/work/<group>, file_path = one of your files' absolute path, files = the rest). Others publish at the same time; on "haven't viewed the latest version", plain-read the url, check your files weren't changed by someone else, and publish again. If a screen gets taller, update `$preview` and report the new height.

Report briefly: per file, which covers were clipping and what you changed.
