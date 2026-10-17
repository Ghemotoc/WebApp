We are working on story S1-E1-03 (Design tokens, themes and app shell) only. S1-E1-01 is merged.

Read first: CLAUDE.md, docs/definition-of-done.md (all the design rules), the story S1-E1-03 in docs/stories/, design/README.md, and these boards' HTML in design/boards/: Discover, Story, Reader, Search, Settings, AdFormats, AdminSponsors and AdminUsers. Look at the matching pictures in design/renders/ too.

What I want from this session:
- Design tokens taken from the boards' HTML, not guessed: colours (light and night), the four fonts (Bricolage Grotesque headings, Inter body, Cutive eyebrows at 14 px in sentence case, Shadows Into Light Two handwriting), type sizes, spacing, radii, borders and focus rings.
- The app shell: the floating top bar from the public boards, the staff bar from the admin boards, the footer, light and night mode, and "reduce motion" respected.
- A /design route that shows every component on one page, built to match the boards: buttons, links, pills and chips (every state), the drop-down with the tmc-sel rule and the 14 px chevron, inputs, cards and story cards, shelves with scroll arrows that only show when the row overflows (no visible scrollbar), label rows with fine lines (tmc-rows), notices, the ad slots (wide banner, portrait, side box, in-list card, each labelled "Ad" or "Sponsored"), and an empty state.
- A CI contrast test for every text and background token pair (WCAG 2.2 AA), and axe on /design.

If this is too big for one pull request, propose a split into S1-E1-03a (tokens, themes, shell) and S1-E1-03b (the /design components page) in your plan.

STEP 1, PLAN ONLY. Give me the files, a table mapping each acceptance criterion and each design rule to its test or check, and anything OPEN or unclear. Ask; don't guess.

STEP 2, after I approve: build, run every check, push your working branch (in a cloud session, the branch the session was given), open the pull request titled "S1-E1-03: ..." and give me the summary, the check results, the steps to open /design on my Mac next to the canvas pictures, and the pull request description.
