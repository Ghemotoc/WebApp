# Landing pages

Pages at `/c/<name>` for contests, campaigns and information, built by admins from fixed blocks in
Romanian and English (story S1-E11-14). Built in bundle CONTESTS-13a1; pictures, featured stories,
Remind me and the link preview arrive in 13a2, contests themselves in 13b.

- `api/landingPages.ts`: the one way the app reads and writes landing pages: `landing_page()` for
  visitors, the tables and `admin_*_landing_page*` functions for staff.
- `hooks/usePublicLandingPage.ts` (visitors) and `hooks/useLandingPageEditor.ts` (the staff list
  and one page's editor).
- `components/LandingPageScreen.tsx` (the route), `LandingPageView.tsx` and `LandingBlockView.tsx`
  (the page, also used by the editor's preview).
- `components/staff/`: the Landing pages tab of Staff › Website and its editor.
- `lib/blocks.ts`: adding, moving and changing blocks without a server; `lib/problemLabels.ts`:
  names the fields the server says to fix.

The block kinds and their limits are in `src/schemas/landingPages.ts`, mirrored by
`landing_block_field_rules()` in the database. The interface text is the `landingPages`
namespace, registered by `registerLandingPageTranslations.ts`; the page's own words come from the
CMS, never from the locale files.
