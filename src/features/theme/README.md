# Theme

Light and night mode. Built by S1-E1-03.

- `hooks/useThemePreference.ts`: reads, saves and applies the reader's choice (Device, Light or Night) and follows the device live when the choice is Device.
- `components/ThemeSelect.tsx`: the Device / Light / Night drop-down in the footer.

How it fits together:
1. `public/theme-init.js` runs before the page draws and sets `data-theme` on `<html>`, so night readers never see a white flash.
2. `src/styles/tokens.css` has one set of colours for `data-theme="light"` and one for `data-theme="night"`.
3. `src/lib/theme.ts` holds the shared logic. The choice is kept on this device only, in localStorage; it is never sent anywhere.

Decision (Robert, 17 Oct 2026): night mode follows the device by default, with this drop-down in the footer and no switch in the top bar.
