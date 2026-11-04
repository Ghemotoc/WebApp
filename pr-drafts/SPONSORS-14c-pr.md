<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #119

Bundle 14 SPONSORS, part c: sponsor reporting (S1-E12-03). This branch sits on top of #320 (and so on #319 and #318). It targets #320's branch until those merge, and then main.

## What changed

- **Counting** (criterion 1): `campaign_daily_stats` keeps one row per campaign per day, holding two numbers: impressions and clicks. It has no user column, no cookie is involved and nothing about the reader is sent.
  - A sponsor's ad or "Sponsored by" line counts one impression each time it appears.
  - Following its link counts one click.
  - Both go through `record_sponsor_event()`, which only counts a campaign that is live today and quietly ignores anything else.
  - A count that fails to send goes to the browser console and never interrupts the reader.
- **The report** (criterion 2): every saved campaign's page in Staff › Sponsors now has a Report section, ended campaigns included.
  - It shows a table of every day of the run so far, newest first, with quiet days as zeros and a totals row.
  - "Download CSV" saves `day,impressions,clicks`, oldest first. The file is named after the campaign and its last day.
  - Only owner and admin can read it (`admin_sponsor_campaign_report()`). Reading it isn't logged because it holds totals only.
- `sponsor_credit()` now also returns the campaign's key, so the "Sponsored by" line counts too.
- **Records:** the READMEs of both feature folders and the code tour.

## How it was tested

- Database test `273-sponsor-reports` (10 tests) covers:
  - a visitor's impressions and click add to today's row;
  - a draft campaign, a bad key or an unknown kind counts nothing and raises nothing;
  - the table has no user column;
  - the new policy, allowed (admin) and denied (writer);
  - a moderator can't read the report;
  - the report lists every day with zeros for quiet days.
- `021-signed-out-reads` lists the new table.
- Unit tests for the CSV and its file name.
- e2e `sponsored-ads.spec.ts` has a new test: a visitor sees the ad and follows its link, the totals go up, then the admin opens the campaign's Report and downloads a CSV with yesterday and today's counts. `sponsors-admin` and `ads` ran unchanged.

## Local check run

LOCALRUN

## By hand

- Nothing to set.

## Follow-ups

- The counts can't tell a person from a bot, because they deliberately store nothing about who saw an ad. If sponsors ever need filtered numbers, that's a decision for you: any filter means keeping something about the visitor.
- Part d: the non-personalised ad network, behind an ADR and off until the publisher ID exists.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
