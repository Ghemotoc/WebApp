# branding

The logo and the emblem, for the light and the night theme, that the owner and admins upload in
Staff › Website › Branding (bundle BRAND-1; Robert, 4 Nov 2026, 14:25 UTC). The emblem is also the
browser tab icon. An empty slot shows the bundled default: the sleeping cat Robert chose as the logo for
every platform (6 Nov 2026, 18:34 UTC; bundle LOGO-1) for the emblem, and the product name as
text for the logo. The app header, the staff header and the footers all show it through
`BrandMark`.

- `api/brandAssets.ts`: the four slots (`brand_asset_slot`), the staff read
  (`admin_brand_assets()`) and the `admin_set_brand_asset()` and `admin_clear_brand_asset()` calls.
  The upload itself is `uploadBrandPicture()` in `src/features/pictures/api/pictureUploads.ts`, so it
  goes through the picture check like every other upload (CLAUDE.md rule 19).
- `lib/brandDefaults.ts`: the bundled default for each slot (`public/brand/`).
- `hooks/useBrandSlots.ts`: the staff page's slots (read again while a picture waits), upload and
  "Use the default".
- `api/publishedBrand.ts` and `hooks/useBrandAssets.ts` (part b): the approved pictures every
  visitor sees, laid over the defaults, read again before their signed addresses run out.
- `components/BrandMark.tsx` (the emblem and the name or logo in `TopBar`) and
  `components/BrandTabIcon.tsx` (swaps the tab icon links `index.html` starts with).
- `components/staff/`: `BrandingTab.tsx` (the tab), `BrandSlotCard.tsx` (one slot) and
  `BrandSlotPreview.tsx` (the slot on its theme's page colour).

A new picture waits for its check and a moderator; meanwhile the slot keeps showing its earlier
approved picture, or the default. Every change is in the audit log (`website.brand_asset_set`,
`website.brand_asset_cleared`). Database: migrations `20270128100001` and `20270128100002`, tests
`supabase/tests/database/290-brand-assets.test.sql`.
