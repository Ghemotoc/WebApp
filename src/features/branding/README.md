# branding

The logo and the emblem, for the light and the night theme, that the owner and admins upload in
Staff › Website › Branding (bundle BRAND-1; Robert, 4 Nov 2026, 14:25 UTC). The emblem is also the
browser tab icon. An empty slot shows the bundled default: the cat Nicole Salazar drew (a
placeholder until the new logo is chosen) for the emblem, and the product name as text for the
logo.

- `api/brandAssets.ts`: the four slots (`brand_asset_slot`), the staff read
  (`admin_brand_assets()`) and the `admin_set_brand_asset()` and `admin_clear_brand_asset()` calls.
  The upload itself is `uploadBrandPicture()` in `src/features/pictures/api/pictures.ts`, so it
  goes through the picture check like every other upload (CLAUDE.md rule 19).
- `lib/brandDefaults.ts`: the bundled default for each slot (`public/brand/`).
- `hooks/useBrandSlots.ts`: the staff page's slots (read again while a picture waits), upload and
  "Use the default".
- `components/staff/`: `BrandingTab.tsx` (the tab), `BrandSlotCard.tsx` (one slot) and
  `BrandSlotPreview.tsx` (the slot on its theme's page colour).

A new picture waits for its check and a moderator; meanwhile the slot keeps showing its earlier
approved picture, or the default. Every change is in the audit log (`website.brand_asset_set`,
`website.brand_asset_cleared`). Database: migrations `20270128100001` and `20270128100002`, tests
`supabase/tests/database/290-brand-assets.test.sql`.
