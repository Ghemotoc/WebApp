<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #118

Bundle 14 SPONSORS, part b1: sponsor campaigns in the database, with the minors check before anything goes live (S1-E12-02). Contract first: the tables, rules, functions and tests. Staff › Sponsors comes in part b2, and the sponsored ad and the "Sponsored by" line on the pages in part b3.

## What changed

- **What we never advertise** (`ad_blocked_categories`): gambling and betting, tobacco and every nicotine product, alcohol and politics are fixed and can never be removed (your decision of 2 Nov). Dating is fixed too, because the published terms already promise it. Weight loss, from the board, is listed but staff may remove it. Owner and admin may add more. Anyone can read the list.
- **Sponsors and campaigns** (criterion 1): a sponsor is a name and a website, with no personal data. A campaign holds the sponsor, a picture with alt text in both languages, one line of text, a link, a placement and its dates. The placement is a banner below the chapter, in story lists or between shelves on Discover; "Sponsored by" on a category or a contest; or a featured slot. It shows only on pages whose category, tag and language match, never anything about the reader. An optional discount code is shown as text. Links must be https, and any link with tracking or affiliate parameters is refused (your decision of 2 Nov).
- **The review** (criterion 2): a campaign goes to the queue only when nothing is missing. Approval needs four ticked checks, and the first is "suitable for under-18s: no alcohol, gambling, tobacco, dating or similar". The picture must also have passed the picture check and a moderator's approval. Every sponsor creative waits for a moderator, as landing page pictures do. Any change afterwards puts the campaign back in draft. The reviewer and the time go on the campaign, and every action is in the audit log.
- **On the pages:** `page_ads()` fills each slot with a live, matching sponsor campaign first, labelled "Sponsored" with the sponsor's name, and then our own ads. The same ad never appears twice on a page, and a signed-out visitor and a signed-in reader get the same answer.
- **"Sponsored by"** (criterion 3): `sponsor_credit()` names the sponsor of a category or a contest. Nothing that lists or ranks stories reads it.
- **Class spaces** (criterion 4): no placement can point at a space, and class spaces and class-only stories still get no slot at all (Q70).
- **The app's contract:** the ad's JSON shape now carries a sponsor's fields, plus the credit's shape (`src/schemas/ads.ts`).
- **Records:** the decision log (the review checks, the link rule, which slots each placement fills, dating fixed) and the code tour.

## How it was tested

- Database test `271-sponsor-campaigns` (32 tests) covers:
  - every new policy, allowed and denied;
  - the fixed categories can't be removed, and a staff-added one can;
  - a tracking or affiliate link, a missing picture or missing dates keep a campaign out of review;
  - approval is refused without the minors check and before the picture is approved;
  - the approved campaign fills Discover's banner as "Sponsored" only on matching pages, the same for a visitor and a teenager, and never twice on a page;
  - a change takes it off the pages;
  - "Sponsored by" names the poetry category's sponsor;
  - no placement can name a class space.
- `270-ad-slots` still passes against the rewritten `page_ads()`.
- `021-signed-out-reads` lists the three new tables.
- Unit tests in `src/schemas/ads.test.ts`.
- e2e: `ads.spec.ts` and the picture specs ran unchanged.

## Local check run

LOCALRUN

## By hand

- Nothing to set.

## Board mismatches

- The board's campaign form has a Market row marked OPEN. The story names category, tag and language only, so market targeting is left out until you decide.

## Questions for Robert

None blocking. The proposals are in the decision log: dating is fixed alongside your four, the four review checks are the board's, and the list of refused link parameters is mine.

## Follow-ups

- Part b2: Staff › Sponsors (campaigns, the form, the review queue and the blocked list) and its menu item.
- Part b3: the sponsored ad's look (picture, line, link, discount code with a copy button) and "Sponsored by" on the category lists and contest pages.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
