<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #29

## What changed

Writers can add a song from Spotify or Apple Music, or a video from YouTube, Vimeo or Loom, to a chapter: Insert › Music or Insert › Video, paste a link. Readers see a card with the title and "Plays from YouTube. YouTube may use cookies.", and nothing loads from the service until they press play. Everything sits behind the new `media_embeds` flag, off until GO-LIVE. ADR 0008 records the click-to-load design (CLAUDE.md rule 7).

**Database** (`20261103110001_s1_e3_10_enums.sql`, `20261103110002_s1_e3_10_music_and_video.sql`):
- a new table `chapter_embeds` (user content, reportable as `embed`). It stores the service, a short media path and the clean source link, with checks on their shape for each service;
- `register_chapter_embed()`: the flag, the account gate, the chapter must be the caller's, and an hourly limit (`embed_add`);
- `save_chapter_draft()` refuses more than 10 cards (setting `chapter_max_embeds`) or a card that isn't the writer's;
- `get_chapter()` returns each card. A card a moderator removed comes back only as `removed`;
- `admin_case_embed()` gives moderators the card and its link;
- `embed` branches in `reportable_item_owner()`, `reportable_item_summary()` ("Video from YouTube in chapter N of <title>"), `case_item_content()` and `notification_item_json()`.

**Server**: `/api/embed` (`server/embeds.ts`, `functions/api/embed.ts`) accepts only the five services in their known shapes. It fetches the title from the service's oEmbed and saves the card with the writer's own token. `OEMBED=real` asks the services; otherwise a stub answers.

**Front end**:
- the reader's card (`src/features/embeds/`). Play swaps in the service's own player from a fixed host: youtube-nocookie.com, Vimeo with `dnt=1`. Stop takes the player away, and focus moves between the two buttons;
- the editor's card with Remove, and the Add music and Add a video dialog;
- the moderator's case panel.

**A bug found on the way**: `ChapterText` built its Markdown drawers anew on every render, so React rebuilt every picture and card whenever the page redrew. A playing video would have stopped by itself. The drawers are now defined once and read the pictures and cards from a context.

## How it was tested

- Database test `186-music-and-video` (26 tests). It covers allowed and denied cases for both policies, the flag, the account, someone else's chapter, the limit of 10, a removed card in `get_chapter()`, the report branches and the case function. `021` lists the new table.
- Unit tests:
  - `embed-links.test.ts` covers every link shape, look-alike hosts, script addresses and the player addresses;
  - `chapter-embeds.test.ts`;
  - `server/embeds.test.ts` covers the schema, a signed-out caller, a link from another site, a missing video, the writer's token and the refusals;
  - `chapterMarkdown.test.ts` (round trip) and `embeds.test.ts`.
- e2e `music-and-video.spec.ts` (8 tests):
  - a link from another site and a missing video are explained;
  - a YouTube link becomes a card, and the stored link has its tracking parameter removed;
  - a reader's browser makes no request to YouTube before play, then loads the youtube-nocookie.com player;
  - Report works, and a removed card shows the marker while the chapter stays up;
  - with the flag off there is no Music or Video;
  - axe and widths at 390 px (Romanian), 768 px and 1440 px for the editor, the dialog, the reader and the playing card.
- The existing specs for the screens it touches pass when run one at a time: `chapter-editor`, `chapter-editor-offline`, `chapter-likes`, `chapter-pictures`, `chapter-reader`, `manage-chapters`, `moderation-queue`, `publish`, `report-dialog` and `teaser`. With the new spec that is 114 tests. They clash when run two at a time on one database, because they share the seed story. The bundle's full run uses the split script.
- Screenshots checked by eye: the editor with a video and a song at 1440 px, the reader at 390 px (Romanian) and 1440 px, before and after play.

## Local check run

| Check | Result |
| --- | --- |
| lint, typecheck, types:check, i18n:check, migrations:check | pass |
| third-party:check | pass (the five player hosts are reviewed, see ADR 0008) |
| unit tests | 134 files, 810 passed (plus the new files) |
| db reset + test db | 96 files, 2,053 tests, PASS |
| functions build | compiled |
| e2e | the new spec and the 10 related specs, 114 passed. The whole suite runs once at the end of the bundle (before 5f merges) |

## By hand

- Nothing on staging: no SQL top-up and no new secrets. The flag stays off.
- GO-LIVE, in this order:
  1. add a line on music and video cards to the privacy notice;
  2. check that youtube-nocookie.com and Vimeo's do-not-track still work as promised (the story asks for this check);
  3. set `OEMBED=real` in Cloudflare Pages;
  4. replace the service names on the cards with the official logos from each brand kit;
  5. switch `media_embeds` on.
- Optional: read the new Romanian lines (`embed` and `embedDialog` in `editor.json`; `embed` in `reading.json` and `moderation.json`).

## Board mismatches

These are noted in `docs/board-fixes.md`:
- there is no "Change link": the writer removes the card and adds a new one;
- the service name appears as text until the official logos arrive;
- the card shows no thumbnail before play, because a thumbnail would load from the service;
- the card has an added line saying that the service's own terms apply after play.

## Follow-ups

- Apple Music has no public oEmbed, so its cards show the service name instead of a title.
- The title comes from the oEmbed answer on our server. A tampered client can't change it, but the writer chooses which public video to link, so moderation relies on reports, as for any text.
- The privacy notice wording for embeds is for Robert or the lawyer.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
