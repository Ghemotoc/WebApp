# ADR 0008: Music and video cards load nothing from the service until the reader presses play

- **Date:** 31 October 2026
- **Status:** Proposed by the builder (WRITE-5b, S1-E3-10). The flag `media_embeds` stays off until GO-LIVE.

## Decision
A writer can add a song from Spotify or Apple Music, or a video from YouTube, Vimeo or Loom, to a chapter. It is stored and shown as a card, and the service's player is loaded only when a reader presses play.

- **Only allowed links, in known shapes.** `src/lib/embed-links.ts` turns a link into a service and a short media path (a YouTube video ID, `track/<ID>` on Spotify). The database checks the same shapes again. The player host is fixed in code for each service, so a stored card can only ever play from that service's own player.
- **Our server asks for the title.** `/api/embed` (a Cloudflare Pages Function) calls the service's oEmbed address and saves the card through `register_chapter_embed()` with the writer's own token. No service key is used. Apple Music has no public oEmbed, so its cards name the service instead of a title.
- **The text holds only a reference.** A card is `![title](embed:<card ID>)` on its own line. Nothing from the other service is in the chapter's text.
- **Click to load.** Before play the reader's browser loads no script, iframe, thumbnail or font from the service. Play adds a sandboxed iframe from the privacy-enhanced address: `youtube-nocookie.com` for YouTube, `dnt=1` for Vimeo, and the services' standard embed players for Loom, Spotify and Apple Music. Stop removes it again.
- **The card says so.** It reads "Plays from YouTube. YouTube may use cookies." and "Once you press play, YouTube's own terms and age rules apply."
- **Moderation.** Each card is its own reportable item (`embed`). A moderator can remove one card without unpublishing the chapter, and readers then see "[Removed by the moderation team]".

## Why
- CLAUDE.md rule 7: no third-party scripts or cookies without an ADR. With click-to-load, nothing from the service reaches a reader who doesn't choose to play, and once they do, the service's own terms apply. That is what the story's legal note asks for.
- Fixing the hosts in code and storing only media paths means a tampered request can't turn a card into an iframe pointing anywhere else.
- Fetching oEmbed on our server keeps the reader's visit away from the service. It also means the title is found once, not on every read.

## Consequences
- GO-LIVE: add a line on music and video cards to the privacy notice, set `OEMBED=real` in Cloudflare, replace the service names on the cards with each brand kit's official logo, then switch `media_embeds` on.
- `scripts/check-third-party.ts` lists the player hosts as reviewed.
- Whether youtube-nocookie.com and Vimeo's `dnt=1` keep their promises is the services' responsibility. The story asks us to check before relying on them, so the GO-LIVE list asks for that check too.
- A new service means a reader in `embed-links.ts`, a value in the `embed_service` enum, its shape in the database check and a reviewed host.
