/**
 * The uptime checks, as one script (QA-8, finding H1; architecture 1.12, Observability: "uptime
 * checks on the web app, the teaser route and the authorities' contact mailbox flow").
 *
 * Why a script as well as a monitor: the outside monitor (docs/runbooks/uptime-checks.md) pings the
 * same four addresses every few minutes and alerts the on-call phone; this script is the written
 * definition of "up" for each of them, so the monitor's settings can be checked against it, and
 * anyone can run it by hand after a deploy:
 *   SITE_URL=https://ghemotoc.themagiccoffin.com STORY_SLUG=<a public story> npx tsx scripts/ops/check-uptime.ts
 * Who calls it: a person after a deploy or during an incident; its tests (check-uptime.test.ts).
 * What it calls: fetch, read-only. It never posts to the notice form (that would open a real case):
 * a GET answered 405 proves the function is deployed and answering, and the monthly end-to-end test
 * of the form is in docs/runbooks/notice-form.md.
 */

/** One address to check and what counts as up for it. */
export interface UptimeCheck {
  /** A plain name for the report and the monitor. */
  name: string;
  /** The path after the site address. */
  path: string;
  /** The status a healthy answer has. */
  expectedStatus: number;
  /** Text a healthy answer's body must contain, when the status alone doesn't prove enough. */
  expectedText?: string;
}

/** What one check found. */
export interface UptimeResult {
  name: string;
  isUp: boolean;
  detail: string;
}

/**
 * The four checks for a site.
 *
 * @param storySlug - the slug of a public story that will stay published (the teaser route)
 * @returns the checks, in the order they are reported
 */
export function uptimeChecks(storySlug: string): UptimeCheck[] {
  return [
    // The web app: the one HTML page every address is served from.
    { name: 'web app', path: '/', expectedStatus: 200, expectedText: '<div id="root">' },
    // The teaser route (S1-E4-04): a Pages Function that draws a link preview for WhatsApp and the
    // like, so its answer carries Open Graph tags. A 200 without them means the function is down
    // and the plain app page answered instead.
    {
      name: 'story link preview',
      path: `/s/${storySlug}`,
      expectedStatus: 200,
      expectedText: 'og:title',
    },
    // The report form's page (S1-E10-02), where authorities send removal orders.
    { name: 'report form page', path: '/report', expectedStatus: 200 },
    // The form's function takes only POST, so a GET is refused with 405 when it is deployed and
    // answering; a 404 or 5xx means orders can't reach us.
    { name: 'report form function', path: '/api/notice', expectedStatus: 405 },
  ];
}

/**
 * Decides whether one answer counts as up.
 *
 * @param check - what was asked for
 * @param status - the answer's HTTP status
 * @param body - the answer's text
 * @returns the result, with a short reason when it is down
 */
export function judgeAnswer(check: UptimeCheck, status: number, body: string): UptimeResult {
  // Step 1: the status must be the expected one.
  if (status !== check.expectedStatus) {
    return {
      name: check.name,
      isUp: false,
      detail: `answered ${status}, expected ${check.expectedStatus}`,
    };
  }
  // Step 2: where the status isn't enough, the body must hold the marker.
  if (check.expectedText !== undefined && !body.includes(check.expectedText)) {
    return {
      name: check.name,
      isUp: false,
      detail: `answered ${status} without "${check.expectedText}"`,
    };
  }
  return { name: check.name, isUp: true, detail: `answered ${status}` };
}

/**
 * Runs one check against the site.
 *
 * @param siteUrl - the site address, without a trailing slash
 * @param check - the check to run
 * @returns the result; a network failure or a time-out counts as down
 */
async function runCheck(siteUrl: string, check: UptimeCheck): Promise<UptimeResult> {
  try {
    // Ten seconds is far longer than a healthy answer takes; anything slower is down for a reader.
    const answer = await fetch(`${siteUrl}${check.path}`, { signal: AbortSignal.timeout(10_000) });
    return judgeAnswer(check, answer.status, await answer.text());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { name: check.name, isUp: false, detail: `no answer (${reason})` };
  }
}

/** Runs every check, prints one line each and exits 1 when anything is down. */
async function main(): Promise<void> {
  const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '');
  const storySlug = process.env.STORY_SLUG ?? '';
  if (siteUrl === '' || storySlug === '') {
    console.error('check-uptime: set SITE_URL and STORY_SLUG.');
    process.exit(1);
  }
  const results = await Promise.all(
    uptimeChecks(storySlug).map((check) => runCheck(siteUrl, check)),
  );
  for (const result of results) {
    console.log(`${result.isUp ? 'up  ' : 'DOWN'}  ${result.name}: ${result.detail}`);
  }
  process.exit(results.every((result) => result.isUp) ? 0 : 1);
}

// Run only when started directly, not when the tests import the functions.
if (process.argv[1]?.endsWith('check-uptime.ts') === true) {
  void main();
}
