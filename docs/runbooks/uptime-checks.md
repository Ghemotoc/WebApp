# Uptime checks and the first platform limits (QA-8)

Written by QA-8 (independent QA check, 5 Nov 2026, findings H1 and S7; architecture 1.12,
Observability: "uptime checks on the web app, the teaser route and the authorities' contact
mailbox flow"). Nothing here runs yet: setting up the outside monitor is a GO-LIVE step done by
hand, because it needs an account in the company's name and the on-call phone numbers.

## What "up" means

`scripts/ops/check-uptime.ts` is the written definition, and its tests (`check-uptime.test.ts`)
keep it honest. Four addresses:

| Check | Address | Up when | Why this, and not just "it answered" |
| --- | --- | --- | --- |
| Web app | `/` | 200 and the page holds `<div id="root">` | Every address is served from this one page |
| Story link preview | `/s/<a public story>` | 200 and the page holds `og:title` | The Pages Function (S1-E4-04) draws the preview. If it is down, Cloudflare answers 200 with the plain app page, so the status alone would say "up" |
| Report form page | `/report` | 200 | Where authorities send removal orders (S1-E10-02) |
| Report form function | `/api/notice` (a GET) | 405 | The function takes only POST, so a refused GET proves it is deployed and answering. A 404 or 5xx means orders can't reach us. We never POST from a monitor: that would open a real case |

Run it by hand after a deploy or during an incident:

```
SITE_URL=https://ghemotoc.themagiccoffin.com STORY_SLUG=<a public story that stays published> \
  npx tsx scripts/ops/check-uptime.ts
```

It prints one line per check and exits 1 if anything is down. It only reads.

The fourth item in the architecture, "the authorities' contact mailbox flow", is more than a page
answering: an order must reach the support inbox and the queue. That end-to-end test sends a real
form, so it stays a monthly check by hand in `notice-form.md`, not something a monitor does every
few minutes.

## Setting up the monitor (GO-LIVE, by hand)

1. Pick an outside monitor with an EU account and no tracking of visitors (for example Better
   Stack or UptimeRobot; the choice is the owner's, and it is a processor only of our own
   addresses, so no personal data goes to it). Open it in the company's name (`docs/accounts.md`).
2. Add the four checks above with the same rules: the expected status, and the text for the first
   two ("keyword" checks). Use a story from the official account (a classic) as `<a public
   story>`, so a writer deleting their story never sets off the alarm.
3. Every 5 minutes, from at least two regions, and alert only after two failures in a row, so one
   slow answer doesn't wake anyone.
4. Alerts go to the on-call phone (the rota in Staff › On-call, S1-E10-09) and to
   `hello@themagiccoffin.com`'s team inbox. The report form checks are the urgent ones: a removal
   order has a one-hour clock (TCO Regulation art. 3(3)).
5. After setting it up, break one check on purpose (point it at `/s/no-such-story`) and confirm
   the alert arrives, then put it back. Note the date in the table below.

| Date set up | Who | Monitor | Test alert received |
| --- | --- | --- | --- |
| (not yet: GO-LIVE) | | | |

## The first platform limit: Cloudflare Pages Functions (S7)

After the database, the first limit we hit is Cloudflare's. Every story and chapter link page
(`functions/s/` and `functions/c/`) and the report form run a Pages Function, and the free plan
allows **100,000 function requests a day**. That is roughly 10,000 to 20,000 active readers a
day. Past it, those addresses fail until the next day.

- **At launch (GO-LIVE budget step):** move the Cloudflare account to the **Workers Paid plan,
  about $5 a month**, which lifts the limit to 10 million requests a month (check the current
  price and limits on Cloudflare's pricing page when you do it). Add it to the running costs.
- **Until then:** Cloudflare's dashboard (Workers & Pages › the project › Metrics) shows the daily
  function requests. If they pass about 60,000 a day, upgrade that week.
- The app polls for updates instead of using Realtime, so a busy day also raises the database's
  request count; watch Supabase's usage page alongside.
