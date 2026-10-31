/**
 * trackEvent: sends one catalogued event to the cookieless analytics tool, or nothing at all
 * (story S1-E15-01; docs/adr/0007-cookieless-analytics-without-a-script.md).
 *
 * How it stays private:
 * - no script from the provider is loaded and no cookie or storage is used: one plain request
 *   per event, sent without credentials;
 * - no page views and no addresses: every event is reported against the site's root, so a URL
 *   with a username or a story in it never leaves;
 * - only the event's name and its catalogued properties (catalogue.ts), which hold no personal
 *   data; nothing is sent while the browser asks not to be tracked (Do Not Track or Global
 *   Privacy Control);
 * - it is off unless VITE_ANALYTICS_PROVIDER names a provider (the choice is OPEN, Q49: Plausible
 *   or Umami Cloud, both EU-hosted), so local development, tests and staging send nothing.
 * A failed send is ignored on purpose: analytics must never break or slow a screen.
 * Who calls it: the screens listed in docs/analytics-events.md. What it calls: the provider's
 * events address, from the VITE_ANALYTICS_* build variables (analyticsConfigFrom()).
 */
import type { AnalyticsEventName, AnalyticsEventProperties } from './catalogue';

/** The providers the adapter can talk to. 'off' sends nothing. */
export type AnalyticsProvider = 'off' | 'plausible' | 'umami';

/** Where events go, from the VITE_ANALYTICS_* build variables. */
export interface AnalyticsConfig {
  provider: AnalyticsProvider;
  /** The provider's events address, for example https://plausible.io/api/event. */
  endpoint: string;
  /** Plausible's site domain, or Umami's website ID. */
  site: string;
}

/**
 * Reads the configuration from the build variables; anything missing or unknown means off.
 *
 * @param environment - import.meta.env, or a test's values
 * @returns the configuration
 */
export function analyticsConfigFrom(
  environment: Record<string, string | undefined>,
): AnalyticsConfig {
  const provider = environment.VITE_ANALYTICS_PROVIDER ?? 'off';
  const endpoint = environment.VITE_ANALYTICS_ENDPOINT ?? '';
  const site = environment.VITE_ANALYTICS_SITE ?? '';
  const isKnown = provider === 'plausible' || provider === 'umami';
  if (!isKnown || endpoint === '' || site === '')
    return { provider: 'off', endpoint: '', site: '' };
  return { provider, endpoint, site };
}

/** The configuration of this build. */
const buildConfig = analyticsConfigFrom(import.meta.env as Record<string, string | undefined>);

/**
 * True when the browser asks not to be tracked.
 *
 * @param browser - the navigator, or a test's stand-in
 * @returns whether Do Not Track or Global Privacy Control is on
 */
export function browserAsksNotToTrack(
  browser: { doNotTrack?: string | null; globalPrivacyControl?: boolean } | undefined,
): boolean {
  if (browser === undefined) return true;
  return browser.doNotTrack === '1' || browser.globalPrivacyControl === true;
}

/**
 * The request body for one event, in the provider's own shape.
 *
 * @param config - the provider and site
 * @param name - the event
 * @param properties - its catalogued properties
 * @param siteRoot - the site's root address, the only address ever sent
 * @returns the JSON body
 */
export function eventBody(
  config: AnalyticsConfig,
  name: string,
  properties: Record<string, string>,
  siteRoot: string,
): string {
  if (config.provider === 'umami') {
    return JSON.stringify({
      type: 'event',
      payload: {
        website: config.site,
        name,
        url: '/',
        hostname: new URL(siteRoot).hostname,
        data: properties,
      },
    });
  }
  return JSON.stringify({ name, url: siteRoot, domain: config.site, props: properties });
}

/**
 * Sends one event, or nothing while analytics is off or the browser asks not to be tracked.
 *
 * @param name - a catalogued event
 * @param properties - exactly its catalogued properties
 * @param config - the configuration (this build's by default; tests pass their own)
 */
export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  properties: AnalyticsEventProperties[Name],
  config: AnalyticsConfig = buildConfig,
): void {
  // Step 1: off, or asked not to: nothing leaves the browser.
  if (config.provider === 'off' || typeof window === 'undefined') return;
  if (browserAsksNotToTrack(window.navigator as Navigator & { globalPrivacyControl?: boolean })) {
    return;
  }
  // Step 2: one request, without cookies, reported against the site's root only.
  const body = eventBody(
    config,
    name,
    properties as Record<string, string>,
    `${window.location.origin}/`,
  );
  void fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'omit',
    keepalive: true,
    body,
  }).catch(() => undefined);
}
