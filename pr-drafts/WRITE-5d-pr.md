<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #31

## What changed

Writers can design a story's cover in their own Canva account and bring it straight back. In Story settings, "Design it in Canva (opens a new tab)" opens our `/canva/start` page in a new tab.
- The first time, that tab goes to Canva's consent page, so nothing is shared with Canva before the writer agrees (criterion 4).
- After that, it opens a blank 1600 × 2560 design (criterion 1).
- When the writer presses Return in Canva, our server checks Canva's signed return token and exports the design as a PNG (criterion 2).
- The tab then uploads it through the normal cover upload: location data removed, private until the picture check passes (criterion 3). Then it is saved as the cover.

Everything sits behind a new flag, `canva_covers`, which is off. A stand-in plays Canva's part until there is a Canva developer app (ADR 0009).

- **Database** (`…_s1_e3_12_canva_covers.sql`):
  - the flag;
  - `canva_connections`: one row per writer, holding encrypted tokens only. The writer can read their own row; there are no direct writes;
  - `save_canva_connection()`, which checks the account and the flag;
  - `disconnect_canva()`, which works even with the flag off, so a writer can always leave.
- **Server** (`server/canva.ts`, `server/canva/`, `functions/api/canva/[[path]].ts`):
  - OAuth with PKCE. The client secret lives only in Cloudflare.
  - The tokens are encrypted with AES-GCM and `CANVA_TOKEN_KEY` before they are saved. They are refreshed when expired.
  - The return token is checked with RS256 against Canva's published keys, including its expiry and audience.
  - The export is a PNG. Disconnect asks Canva to revoke the token.
  - Every call uses the writer's own sign-in token and never a service key. Nothing is logged.
- **Stand-in** (`CANVA` unset or "stub"; always the case locally and in e2e):
  - our own consent page (Allow, Cancel) and editor (Return) at `/api/canva/stub/…`;
  - HS256 return tokens with a fixed key, which the real check never accepts;
  - a drawn 1600 × 2560 PNG as the export.
- **Screens** (`src/features/canva/`):
  - `CanvaCoverLink` in the cover section, with the board's note text;
  - `/canva/start` and `/canva/return`, which show plain messages for every outcome and a link back to the story's settings;
  - Settings › Canva, which shows "Connected since …" and has Disconnect.
- **Fix in the local functions server:** responses are now sent as bytes, not text. A picture coming through a local function used to be corrupted.

## How it was tested

- Database `187-canva-covers` (12 tests):
  - the flag defaults to off;
  - the RLS policy has its allowed and denied tests;
  - writes are refused without a function;
  - save and replace work, and the save is refused when the account may not write, the flag is off or the caller is signed out;
  - disconnect works, including with the flag off;
  - the table is included in `021` signed-out reads.
- Unit `server/canva/canva-parts.test.ts`:
  - token encryption round trip, a wrong key, tampered text and bad keys;
  - Canva's RS256 token accepted, and refused when expired, made for another app, forged or changed;
  - stand-in tokens are never accepted by the real check;
  - the PNG's header and CRCs are valid.
- Unit `server/canva.test.ts`:
  - schema and sign-in checks, and the flag off;
  - a writer who hasn't connected is sent to the consent page with nothing stored;
  - the connect step stores ciphertext only;
  - the design address carries the story ID;
  - a made-up code or return token is refused;
  - Return gives back a PNG with `X-Story-Id`;
  - disconnect works with the flag off;
  - the stand-in pages give a 404 in real mode, and real mode without settings answers "unavailable".
- e2e `canva-covers.spec.ts` (8 tests):
  - Cancel on the consent page shares nothing;
  - Allow, then design, then Return saves the PNG as an `upload` cover with a `passed` picture check;
  - a second design skips the consent page;
  - Settings shows the connection and Disconnect removes it;
  - axe and widths at 390 px (Romanian), 768 px and 1440 px;
  - with the flag off, neither the button nor the Settings section shows.
- The related specs pass when run one at a time:
  - `automatic-covers`, `chapter-pictures`, `picture-check`, `story-settings`, `chapter-drawings` and `music-and-video`: 73 passed;
  - the Settings specs `contact`, `country`, `email-change`, `epic-s1-e2`, `writer-profile` and `usernames`: 75 passed.
- Screenshots of the button at 390 px (Romanian) and the return page at 1440 px, checked by eye.

## Local check run

| Check | Result |
| --- | --- |
| lint, typecheck, types:check, i18n:check, migrations:check | pass |
| unit tests | 137 files, 828 passed |
| db reset + test db | 97 files, 2,065 tests, PASS |
| functions build | compiled |
| build + third-party check | pass (no Canva host in the browser bundle) |
| e2e | the new spec and 12 related specs: 148 passed. The whole suite runs once at the end of the bundle (before 5f merges) |

## By hand

- Nothing on staging: no SQL top-up. The flag is off, so nothing shows.
- GO-LIVE (in by-hand-for-robert.md):
  - register a Canva developer app, with `https://<site>/canva/return` as both the redirect address and the return address, and get it through Canva's review;
  - set `CANVA=real`, `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET` and `CANVA_TOKEN_KEY` (32 random bytes, base64) in Cloudflare;
  - check the API details in ADR 0009 against Canva's documentation;
  - publish the privacy notice line about Canva (the draft already has it, marked "After launch");
  - add Canva to the processor list if the lawyer says it is one;
  - add Canva's official logo from its brand kit to the button;
  - then switch on `canva_covers` (with `picture_uploads`).
- Optional: read the new Romanian lines (`canva` in `writing.json`).

## Board mismatches

These are noted in `docs/board-fixes.md`:
- the button shows text only until Canva's official logo is added; we don't draw brand logos;
- the cover comes back in the tab Canva used, not in the settings tab. That tab says "Your Canva cover is saved" and links back to the settings;
- the button is only in Story settings, not on a new story, because a cover needs the story to exist first (the same as uploads);
- the note adds "Nothing is shared with Canva until you connect" and leaves out the board's "(Idea for later…)".

## Follow-ups

- A real Canva PNG at 1600 × 2560 could be larger than the 5 MB cover limit. If that happens in testing, export as JPG instead.
- The settings tab doesn't refresh by itself when the cover comes back in the other tab. A refresh, or a focus listener, shows it.
- The square cover is still cropped from the tall one, as with uploads.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
