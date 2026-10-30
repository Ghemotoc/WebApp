# Pictures

Uploading a story cover or a profile picture, and showing it only once the picture check passed. Built by S1-E10-05 (SAFE-4). CLAUDE.md rule 19: every uploaded picture is checked before anyone else sees it. Everything here sits behind the `picture_uploads` flag, which stays off until the real checking services are set up (GO-LIVE in `pr-drafts/by-hand-for-robert.md`).

- `api/pictures.ts`: `uploadPicture()` puts the file in the private `covers` or `avatars` bucket and registers it (`register_picture()`), then `requestPictureCheck()` calls `/api/picture-check` with the person's own token. `fetchStoryCoverPicture()` and `fetchAvatarPicture()` return a short-lived signed address for a picture the reader may see. `retryPendingPictures()` asks again for a picture whose check didn't answer (at most 5 tries).
- `hooks/usePictureUpload.ts` (one upload and its message), `hooks/usePictures.ts` (`useStoryCoverPicture`, `useAvatarPicture`, `usePendingPictureRetry`, which AppLayout runs once per signed-in person).
- `components/PictureUploadField.tsx`: the labelled file input and its plain message. `CoverUploadField` (Story settings, only for a saved story) and `AvatarSettingsSection` (Settings) use it.
- `components/StoryCoverArt.tsx` and `AvatarImage.tsx`: draw an uploaded picture where the drawn or automatic cover, or the initials, would be; while a picture is not visible they fall back to those, so nobody sees an unchecked picture.
- The service: `server/picture-check.ts` (Cloudflare Pages Function at `functions/api/picture-check.ts`) with the adapters in `server/picture-check/` (stub, Sightengine, Arachnid Shield). The database side: `…_s1_e10_05_picture_check.sql`. A flagged picture opens a moderation case, shown blurred on the case page (`src/features/moderation/components/CasePicturePanel.tsx`); a known abuse match is never shown and opens a safeguarding case.
- Text: `pictures.*` in `src/locales/{ro,en}/common.json`.
