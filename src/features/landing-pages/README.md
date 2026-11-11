# Landing pages

Pages at `/c/<name>` for contests, campaigns and information, built by staff from fixed blocks in
Romanian and English (story S1-E11-14). Built in bundle CONTESTS-13a1; pictures and featured stories
in 13a2a; Remind me in 13a2b; the link preview (`server/landing-preview.ts`) and CMS links to /c/ in 13a2c, contests themselves in 13b.

- `api/landingPages.ts`: the one way the app reads and writes landing pages: `landing_page()` for
  visitors, the tables and `admin_*_landing_page*` functions for staff.
- `hooks/usePublicLandingPage.ts` (visitors) and `hooks/useLandingPageEditor.ts` (the staff list
  and one page's editor).
- `components/LandingPageScreen.tsx` (the route), `LandingPageView.tsx` and `LandingBlockView.tsx`
  (the page, also used by the editor's preview).
- `components/staff/`: the Landing pages tab of Staff › Website and its editor.
- `hooks/useLandingPictures.ts`, `components/LandingPicture.tsx`, `components/FeaturedStoriesBlock.tsx`
  and `components/staff/BlockPictureField.tsx`, `FeaturedFields.tsx`: pictures and featured stories
  (part 13a2a).
- `hooks/useLandingReminder.ts` and `components/RemindMeBlock.tsx`: Remind me (part 13a2b).
- `components/ContestResultsBlock.tsx`: a contest's published winners and finalists by pen name
  (contests part 13b2b).
- `components/staff/LandingPagesAdminPage.tsx` (Staff › Page builder, the `landing_pages` area),
  `components/BuilderBlocks.tsx`, `components/staff/EntryItemsFields.tsx`, `lib/entries.ts` and
  `lib/builderKinds.ts`: the easier page builder and its five blocks (story S1-E11-34, CMS-2b).
- `lib/layouts.ts`, `components/staff/NewLandingPageForm.tsx` and `CopyPageForm.tsx`: ready-made
  layouts with starter words from the locale files, Copy block and Copy page (story S1-E11-35, CMS-2c).
- `lib/blocks.ts`: adding, moving and changing blocks without a server; `lib/problemLabels.ts`:
  names the fields the server says to fix.

The block kinds and their limits are in `src/schemas/landingPages.ts`, mirrored by
`landing_block_field_rules()` in the database. The interface text is the `landingPages`
namespace, registered by `registerLandingPageTranslations.ts`; the page's own words come from the
CMS, never from the locale files.
