# Canva

"Design it in Canva": a writer designs a story's cover in their own Canva account and brings it
straight back (story S1-E3-12; ADR 0009). Off until there is a Canva developer app
(`canva_covers`, GO-LIVE).

- `components/CanvaCoverLink.tsx`: the "Design it in Canva (opens a new tab)" link in Story
  settings' cover (CoverSection).
- `components/CanvaStartPage.tsx` (`/canva/start?story=<id>`) and
  `components/CanvaReturnPage.tsx` (`/canva/return`): the two pages the new tab passes through,
  framed by `CanvaTripPage.tsx`.
- `components/CanvaSettingsSection.tsx`: "Canva" in Settings, with Disconnect.
- `hooks/`: the pages' work (`useCanvaStart`, `useCanvaReturn`) and the connection
  (`useCanvaConnection`).
- `api/canva.ts`: the calls to `/api/canva/…` (server/canva.ts), the cover upload and save.
- `lib/`: PKCE (`pkce.ts`), the tab's memory of the trip (`canvaTrip.ts`) and the messages.

The server side is `server/canva.ts` with `server/canva/` (the real Canva, the stand-in, the
token encryption and the return-token check). Locally and while `CANVA` isn't "real", the
stand-in plays Canva's part with its own pages, so nothing leaves our server.
