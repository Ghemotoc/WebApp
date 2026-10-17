# Visual spec: the app demo screens and social mock-ups (light theme)

Source: The Magic Coffin Design System (light), adapted for the app as agreed in the master plan's "Prototype design direction" (keep the visual foundations, drop the consultancy's vampire voice: the app talks to writers aged 13+ in a plain, warm voice). Everything is fully in ENGLISH. The app has NO name yet: write the name as the neutral placeholder "[App name]" (wordmark set in Bricolage Grotesque 700, brackets included); handles as "@[appname]".

## Tokens
- Paper ground #FAF8F5; secondary ground #F4F0EC; cards #FFFFFF with a 1px #DED3E4 hairline; radius 4px everywhere except pills/avatars (fully round); NO shadows.
- Heading purple #481C5F; accent purple #672786 (links, active states, focus); gold #E6C24C (fills, bars, tags only; never small text); gold text #815E18.
- Ink #26142E (main text); body #5C4965; meta #6B5A73 (darkened from #8A7A90 for 4.5:1); hairline #E5D7EA.
- Category accents (one per content category, used as a small tag fill or 3px top rule, never as text on paper unless it passes 4.5:1): Fiction #4D1B5E, Poetry #2E4A8C (ultramarine), Journalism #8C2B3A (crimson), Essays #2F6B4F (green), Academic #7A5C12 (tan), Forums #33507A (admiral).
- Type: Bricolage Grotesque (700 headings, 600 UI emphasis), Inter (400/500/600 body and UI), Architects Daughter (only for one small handwritten aside per screen at most, optional). Load from Google Fonts: https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Inter:wght@400;500;600;700&family=Architects+Daughter&display=swap
- Reading text in the chapter reader: Inter 19px/1.75 (reader can change font and size; show the settings control).
- Icons: inline stroke SVG (Lucide style, 1.75 stroke), never emoji in UI chrome. Emoji are allowed only inside user comment reactions (a Stage 1 feature).
- Motion: none needed (static mocks).
- Accessibility: real <button>, <a href>, <input> with <label>; focus ring 2px gold outline offset 2px; touch targets 44px.

## Product facts the screens must show (from the plan; do not invent features beyond these)
- One account type; pen name optional; minimum age 13; year of birth at sign-up, then a Yoti age check (only the result and date are kept).
- Publish chapters: stories, articles (journalism category), essays, poetry.
- Discover: categories, tags, sort (popularity default, newest, oldest, A to Z, completed or ongoing).
- Story page: blurb, chapters list, follow writer, share.
- Chapter reader: reading settings (font, size, dyslexia-friendly option, night mode), inline/paragraph comments with emoji reactions, a CONTEXTUAL banner slot BELOW the chapter text (never inside the text, never full screen), labelled "Sponsored", matching the chapter's category, no tracking ("Why this ad? It matches this chapter, not you").
- Writer's editor: chapter draft, autosave, publish, tags and category, a "content notes" (mature themes) field, "copied from a published work?" report exists for readers.
- Forums: categories and subforums, sticky and locked threads, read/unread with "mark all read", quote and quick reply, post numbers and permalinks, user-created spaces anyone can read; owner can switch on members-only posting; downvotes are private (moderation only, never shown as a public score).
- Private messages with block and report built in; adult-to-minor messages OFF by default.
- Report button on everything: report goes to a moderation queue, a human decides, the user gets a statement of reasons.
- Admin/moderation queue (plain, functional).
- Desktop app first (Windows, macOS, Linux); phones later.

## Sample content (English, Romanian setting, all fictional, label nothing as real)
- Writers (pen names): "inkwolf" (Ioana, 16, Cluj, fantasy), "matei.writes" (Matei, 19, Bucharest, journalism student), "poppyverse" (17, Iași, poetry), "Ana Radu" (21, Timișoara, essays).
- Stories: "The Salt Mine Choir" (fantasy, ongoing, 14 chapters), "Night Bus to Ploiești" (mystery, completed, 22 chapters), "Small Rooms" (poetry collection), "What Our Grandparents Didn't Post" (essay), "Inside the Student Housing Waitlist" (journalism, article).
- Forum: "Writing Craft" > "First chapters"; user space "Fantasy Writers Romania" (members-only posting on); thread "How do you start a chapter without a prologue?" with 23 replies.
- Use realistic but modest numbers (e.g. 1.2k reads, 86 comments). These are demo numbers.

## Placeholders
- Sponsor names: "[Partner bookshop]", "[Partner publisher]". Never real brands.
- QR codes: a neutral square placeholder labelled "QR".
