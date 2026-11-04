# ADR 0009: Canva covers go through our server, with the writer's own Canva account

- **Date:** 3 November 2026
- **Status:** Proposed by the builder (WRITE-5d, S1-E3-12). The flag `canva_covers` stays off until GO-LIVE.

## Decision
A writer can design a story's cover in their own Canva account and bring it straight back as the cover. Our server talks to Canva; the writer's browser only follows links.

- **OAuth with PKCE, our client secret only on the server.** "Design it in Canva" opens `/canva/start` in a new tab. The tab makes a PKCE verifier and a state and keeps them in its own `sessionStorage`. If the writer hasn't connected, our server answers with Canva's consent page, so nothing is shared with Canva before they agree (criterion 4). Canva sends the tab back to `/canva/return` with a code, the tab checks the state, and our server swaps the code for tokens with the client secret, which lives only in Cloudflare.
- **Tokens encrypted at rest.** Our server encrypts both tokens with AES-GCM and `CANVA_TOKEN_KEY` (a Cloudflare secret) and saves them through `save_canva_connection()` with the writer's own sign-in. `canva_connections` holds only ciphertext; no service key is used (CLAUDE.md rule 2).
- **A blank cover-sized design.** Our server creates a custom 1600 × 2560 design and sends the tab to its edit address, with the story's ID as Canva's correlation state.
- **Return is checked.** Canva sends the tab back with `correlation_jwt`. Our server checks its RS256 signature against Canva's published keys, its expiry and, when present, that it was made for our app. Then it exports the design as a PNG and hands the bytes to the tab.
- **The normal cover road.** The tab uploads the PNG with the same `uploadPicture()` as any cover: location data removed, resized, private until the picture check passes (criterion 3, S1-E10-05). Then `update_my_story()` makes it the cover.
- **Disconnect.** Settings › Canva calls our server, which asks Canva to revoke the token and then removes the row (`disconnect_canva()`, which works even with the flag off).
- **A stand-in until there is a Canva app.** While `CANVA` isn't `"real"`, the stand-in serves its own consent page and editor from `/api/canva/stub/…`, signs its return tokens with a fixed HS256 key and exports a drawn PNG. The real Canva check never accepts an HS256 token, and the stand-in's pages answer 404 in real mode.

## Why
- The client secret and the writer's Canva tokens must never reach a browser or the database in plain text; a Pages Function is where our other secrets already live.
- Exporting on our server means the writer's browser never talks to Canva's file host, and the picture comes back through the same upload and check as every other cover.
- The stand-in lets the whole flow be built and tested end to end before the Canva developer app exists, which the story says Canva may review.

## Consequences
- GO-LIVE: register the Canva developer app with `/canva/return` as both the redirect address and the return address, get it through Canva's review, set `CANVA=real`, `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET` and `CANVA_TOKEN_KEY` in Cloudflare, publish the privacy notice line about Canva, add Canva's official logo from its brand kit to the button, then switch `canva_covers` on.
- The Canva API's addresses, scopes and the return token's claims were written from Canva's documentation and must be checked against it before go-live (the story's "check before relying on it").
- A real export over 5 MB would be refused by the cover bucket's limit; if Canva's PNGs run that large, export as JPG instead (follow-up).
- Changing `CANVA_TOKEN_KEY` makes every stored connection unreadable; writers then simply connect again. The ciphertext's `v1.` prefix leaves room for a key change later.
- Cover templates with the title and pen name already placed were built (IDEAS-2e, #333) and then taken out (Robert, 4 Nov 2026, 08:09 to 08:12): Canva lets an app place editable text only through brand templates and autofill, which need Canva Enterprise, and writers use their own accounts. "Design it in Canva" opens a blank cover-size design (1600 × 2560) named after the story. At GO-LIVE, check whether Canva's API now lets an app add text to an ordinary account's design; if it does, "Title" and "Author" boxes can be added then.
