/**
 * The security headers every page of the web app is sent with (independent QA check,
 * 5 Nov 2026, finding X1; architecture 1.9: "strict Content Security Policy"; OWASP ASVS 14.4).
 *
 * Who calls it: vite.config.ts at build time, which writes them into dist/_headers for
 * Cloudflare Pages (https://developers.cloudflare.com/pages/configuration/headers/), and the
 * `vite preview` server, which sends the same headers so the end-to-end tests run under them.
 * What it calls next: nothing; it only builds text.
 *
 * Why each source is allowed (CLAUDE.md rule 7: nothing third-party without a review):
 * - our own site ('self') for scripts, styles, fonts, pictures and the /api functions;
 * - the Supabase project (VITE_SUPABASE_URL) for data, sign-in, Realtime (wss) and signed
 *   picture addresses;
 * - the music and video players, in an iframe only after the reader presses play (ADR 0008);
 * - Google AdSense, loaded only while the ad_network flag is on (S1-E12-04, ADR 0014); its hosts
 *   are the ones Google lists for AdSense and must be checked again when the flag goes on.
 * Inline styles stay allowed ('unsafe-inline' in style-src only): React's style attributes and the
 * editor need them, and a style can't run code. Inline scripts are not allowed.
 */

/** The players a writer may embed (ADR 0008; the same list as scripts/check-third-party.ts). */
const embedPlayerOrigins = [
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://www.loom.com',
  'https://open.spotify.com',
  'https://embed.music.apple.com',
];

/** The hosts AdSense loads from (ADR 0014). Only used while the ad_network flag is on. */
const adNetworkOrigins = [
  'https://pagead2.googlesyndication.com',
  'https://*.googlesyndication.com',
  'https://*.doubleclick.net',
  'https://*.google.com',
  'https://*.gstatic.com',
  'https://*.adtrafficquality.google',
];

/**
 * The Supabase project's origin and its Realtime (WebSocket) origin.
 *
 * @param supabaseUrl - VITE_SUPABASE_URL, for example "https://abc.supabase.co"
 * @returns the http(s) origin and the matching ws(s) origin; empty when the address is unusable
 * @throws nothing: an empty or broken address only leaves Supabase out (the app can't work
 *   without it anyway, and the build's own checks catch a missing VITE_SUPABASE_URL)
 */
export function supabaseOrigins(supabaseUrl: string): string[] {
  try {
    const address = new URL(supabaseUrl);
    // Realtime runs on the same host over WebSocket: wss for https, ws for a local http stack.
    const socketProtocol = address.protocol === 'https:' ? 'wss:' : 'ws:';
    return [address.origin, `${socketProtocol}//${address.host}`];
  } catch {
    return [];
  }
}

/**
 * The Content-Security-Policy value.
 *
 * @param supabaseUrl - VITE_SUPABASE_URL the app is built with
 * @returns one header value, directives separated by "; "
 */
export function contentSecurityPolicy(supabaseUrl: string): string {
  const supabase = supabaseOrigins(supabaseUrl);
  const directives: Record<string, string[]> = {
    // Everything not listed below: our own site only.
    'default-src': ["'self'"],
    // Scripts: our bundle, and AdSense while it is on. No inline script, no eval.
    'script-src': ["'self'", ...adNetworkOrigins],
    'style-src': ["'self'", "'unsafe-inline'"],
    // Pictures: ours, Supabase's signed addresses, drawn avatars (data:) and previews (blob:).
    'img-src': ["'self'", 'data:', 'blob:', ...supabase, ...adNetworkOrigins],
    'font-src': ["'self'", 'data:'],
    // Calls: our /api functions, Supabase (REST, Auth, Storage, Realtime) and AdSense's reports.
    'connect-src': ["'self'", ...supabase, ...adNetworkOrigins],
    // Iframes: the players after play, and AdSense's ad frames.
    'frame-src': [...embedPlayerOrigins, ...adNetworkOrigins],
    // Word, PDF and EPUB files are built in the browser, some in a worker.
    'worker-src': ["'self'", 'blob:'],
    'media-src': ["'self'", 'blob:', ...supabase],
    // Nobody may put our pages in a frame (clickjacking), and no plug-ins.
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Every security header, by name.
 *
 * @param supabaseUrl - VITE_SUPABASE_URL the app is built with
 * @returns header name to value
 */
export function securityHeaders(supabaseUrl: string): Record<string, string> {
  return {
    'Content-Security-Policy': contentSecurityPolicy(supabaseUrl),
    // The browser must not guess a file's type (an uploaded "picture" run as a script).
    'X-Content-Type-Options': 'nosniff',
    // Older browsers that don't read frame-ancestors.
    'X-Frame-Options': 'DENY',
    // Other sites learn only our origin, never the story or chapter address a reader came from.
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // No camera, microphone, location or ad-interest tracking (CLAUDE.md rule 7: no tracking).
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()',
    // HTTPS only, for a year (Cloudflare serves every address over HTTPS).
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

/**
 * The dist/_headers file for Cloudflare Pages: the headers above on every address.
 *
 * @param supabaseUrl - VITE_SUPABASE_URL the app is built with
 * @returns the file's text
 */
export function cloudflareHeadersFile(supabaseUrl: string): string {
  const lines = Object.entries(securityHeaders(supabaseUrl)).map(
    ([name, value]) => `  ${name}: ${value}`,
  );
  return [
    '# Written by vite.config.ts from server/security-headers.ts at build time (QA-1c). Do not edit.',
    '/*',
    ...lines,
    '',
  ].join('\n');
}

/**
 * Adds the security headers to an answer a Pages Function wrote. Cloudflare applies dist/_headers
 * only to the static files it serves itself, so the functions that answer with the app's page
 * (the /s/ and /c/ link previews) add them here.
 *
 * @param response - the function's answer
 * @param supabaseUrl - VITE_SUPABASE_URL from the function's settings
 * @returns a copy of the answer with every security header set
 */
export function withSecurityHeaders(response: Response, supabaseUrl: string): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders(supabaseUrl)))
    headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
