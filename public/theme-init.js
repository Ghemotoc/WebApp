/*
 * Picks light or night mode, the member's look, the "Less motion" switch and high contrast before
 * the page draws, then gives a phone browser's bars the page colour (story S1-E1-03; looks from
 * bundle G2 THEMES; less motion from bundle MOTION-1; high contrast from bundle CONTRAST-1; the
 * bar colour from bundle CALM-1).
 *
 * Why a separate file: index.html loads it in <head>, before any CSS or React, so a reader in
 * night mode never sees a white flash. It is a plain file rather than an inline script so a
 * strict Content Security Policy can allow it later without exceptions (architecture 1.9).
 * It repeats the first steps of src/lib/theme.ts, src/lib/looks.ts, src/lib/motion.ts,
 * src/lib/highContrast.ts and src/lib/browserBarColour.ts; keep the storage keys, the attributes,
 * the media queries, the list of looks, the theme-color meta, the staff area's selector and the
 * --paper token the same in all six files.
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
  // uses it by day; night mode is the same with every look (bundle G2). A seasonal look stored
  // before they were removed (flat themes bundle) falls back to Lilac mist here, and the app then
  // shows the member's own theme.
  const looks = ['lilac', 'sorbet', 'seaglass', 'pistachio', 'candy', 'tmc'];
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

/*
 * Gives a phone browser's own bars the page colour, never black (the simplified design, bundle
 * CALM-1; Robert, 20 Nov 2026, 13:10 UTC). index.html names the day colour for a light phone and
 * the night colour for a dark one; here both theme-color metas follow the theme chosen above, so a
 * reader in night mode on a light phone gets night bars from the first paint. The style sheet has
 * not loaded yet at this point, so a look's own page colour (Sorbet's peach, high contrast's
 * white) is read from --paper once the page has loaded. src/lib/browserBarColour.ts does the same
 * whenever the app changes the theme, the look or high contrast; the two plain colours are the
 * ones in index.html.
 */
(function matchBrowserBarsBeforeFirstPaint() {
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) return;

  // Step 1: the page colour now in force: --paper once tokens.css has loaded, read from the staff
  // area's frame on a staff page (it paints its own colours) and from <html> everywhere else;
  // before that, the plain day or night page colour for the theme chosen above.
  function pageColourNow() {
    const staffArea = document.querySelector('[data-area="staff"]');
    const style = window.getComputedStyle(staffArea || document.documentElement);
    // At night --browser-bar is the flat night page colour (tokens.css); elsewhere it is unset.
    const barColour = style.getPropertyValue('--browser-bar').trim();
    if (barColour !== '') return barColour;
    const fromTokens = style.getPropertyValue('--paper').trim();
    if (fromTokens !== '') return fromTokens;
    const isNight = document.documentElement.getAttribute('data-theme') === 'night';
    if (!isNight) return '#f4f0ec';
    // Before the style sheet: the flat night page colour, as in tokens.css (NIGHT-2).
    return '#0e0e10';
  }

  // Step 2: both metas get it, because the member's choice beats the device's light or dark
  // setting that each meta's media query follows.
  function matchBars() {
    const colour = pageColourNow();
    metas.forEach(function setBarColour(meta) {
      meta.setAttribute('content', colour);
    });
  }

  matchBars();
  // Step 3: once the style sheet has loaded, the exact page colour of the look on show.
  window.addEventListener('load', matchBars, { once: true });
})();
