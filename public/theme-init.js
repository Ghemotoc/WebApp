/*
 * Picks light or night mode, the member's look, the "Less motion" switch and high contrast before
 * the page draws (story S1-E1-03; looks from bundle G2 THEMES; less motion from bundle MOTION-1;
 * high contrast from bundle CONTRAST-1).
 *
 * Why a separate file: index.html loads it in <head>, before any CSS or React, so a reader in
 * night mode never sees a white flash. It is a plain file rather than an inline script so a
 * strict Content Security Policy can allow it later without exceptions (architecture 1.9).
 * It repeats the first steps of src/lib/theme.ts, src/lib/looks.ts, src/lib/motion.ts and
 * src/lib/highContrast.ts; keep the storage keys, the attributes, the media queries and the list
 * of looks the same in all five files.
 * After this, React takes over (src/features/theme/hooks/useAccountAppearance.ts).
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

  // Step 4: the look last shown on this device (Lilac mist when none is stored). tokens.css only
  // uses it by day; night mode is Revolver with every look (bundle G2).
  const looks = [
    'lilac',
    'sorbet',
    'seaglass',
    'pistachio',
    'candy',
    'tmc',
    'winter',
    'spring',
    'summer',
    'autumn',
  ];
  let look = 'lilac';
  try {
    const storedLook = window.localStorage.getItem('theme-shown-look');
    if (looks.indexOf(storedLook) !== -1) look = storedLook;
  } catch {
    // Storage is blocked: the default look.
  }
  document.documentElement.setAttribute('data-look', look);
})();

/*
 * Marks the page for the "Less motion" switch before it draws, so nothing slides in while the app
 * loads (bundle MOTION-1). src/styles/index.css reads the attribute; the device's own
 * reduced-motion setting works by itself, without it. A function of its own to keep each one short.
 */
(function chooseMotionBeforeFirstPaint() {
  try {
    // The member left the switch on in Settings › Appearance on this device.
    if (window.localStorage.getItem('less-motion') === 'on') {
      document.documentElement.setAttribute('data-motion', 'less');
    }
  } catch {
    // Storage is blocked: only the device's setting counts.
  }
})();

/*
 * Marks the page for high contrast before it draws, so nobody who needs it sees the pastel glass
 * first (bundle CONTRAST-1). Either one is enough: the "High contrast" switch left on in Settings ›
 * Appearance on this device, or a device that asks for more contrast. src/styles/tokens.css and
 * src/styles/index.css read the attribute.
 */
(function chooseContrastBeforeFirstPaint() {
  // Step 1: the member's switch, as this device remembers it.
  let isWanted = false;
  try {
    isWanted = window.localStorage.getItem('high-contrast') === 'on';
  } catch {
    // Storage is blocked: only the device's setting counts.
  }
  // Step 2: the device's own setting.
  if (!isWanted && typeof window.matchMedia === 'function') {
    isWanted = window.matchMedia('(prefers-contrast: more)').matches;
  }
  if (isWanted) document.documentElement.setAttribute('data-contrast', 'more');
})();
