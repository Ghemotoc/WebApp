# Embeds

Music and video cards inside chapters: a song from Spotify or Apple Music, or a video from YouTube, Vimeo or Loom. Built by S1-E3-10 (WRITE-5b; ADR 0008). Everything sits behind the `media_embeds` flag, off until GO-LIVE (`pr-drafts/by-hand-for-robert.md`).

- `api/embeds.ts`: `addChapterEmbed()` calls `/api/embed` with the writer's own token; `embedViewsFromJson()` reads the `embeds` map that `get_chapter()` and `my_embeds()` return; `fetchMyEmbeds()` gives the editor and the preview the writer's own cards.
- `hooks/useEmbeds.ts`: `useMyEmbeds(ids)` and `useEmbedAddition()`.
- `components/ChapterEmbed.tsx`: the reader's card. Before play nothing loads from the service (criterion 2); Play swaps in `EmbedPlayer.tsx`, the service's own player from a fixed host (criterion 3); Stop takes it away. A card a moderator removed shows "[Removed by the moderation team]" (criterion 4).
- The link rules and player addresses: `src/lib/embed-links.ts`. How a card is written in the text: `src/lib/chapter-embeds.ts`. The server: `server/embeds.ts` and `server/embeds/oembed.ts`. The database: `…_s1_e3_10_music_and_video.sql`.
- The editor side lives in `src/features/writing/` (`lib/chapterEmbedNode.ts`, `components/ChapterEmbedNodeView.tsx`, `components/EmbedInsertDialog.tsx`); the moderator's view in `src/features/moderation/components/CaseEmbedPanel.tsx`.
- Text: `embed.*` in `reading.json`, `embed.*` and `embedDialog.*` in `editor.json`, `embed.*` in `moderation.json`.
