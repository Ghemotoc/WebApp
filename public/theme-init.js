/*
 * Picks light or night mode before the page draws (story S1-E1-03).
 *
 * Why a separate file: index.html loads it in <head>, before any CSS or React, so a reader in
 * night mode never sees a white flash. It is a plain file rather than an inline script so a
 * strict Content Security Policy can allow it later without exceptions (architecture 1.9).
 * It repeats the first steps of src/lib/theme.ts; keep the storage key and the attribute the same.
 * After this, React takes over (src/features/theme/hooks/useThemePreference.ts).
 */
(function chooseThemeBeforeFirstPaint() {
  // Step 1: the reader's saved choice, if storage is available ('device' otherwise).
  let preference = 'device';
  try {
    const storedValue = window.localStorage.getItem('theme-preference');
    if (storedValue === 'light' || storedValue === 'night' || storedValue === 'device') {
      preference = storedValue;
    }
  } catch {
    // Storage is blocked (for example a private window): follow the device.
  }

  // Step 2: "device" follows the operating system's dark mode setting (Robert, 17 Oct 2026).
  let theme = preference;
  if (preference === 'device') {
    const deviceIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = deviceIsDark ? 'night' : 'light';
  }

  // Step 3: tokens.css reads this attribute.
  document.documentElement.setAttribute('data-theme', theme);
})();
