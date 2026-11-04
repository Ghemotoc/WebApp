<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #118

Bundle 14 SPONSORS, part b3: what a reader sees once a sponsor's campaign is live (S1-E12-02). This branch sits on top of #319, which sits on #318, so it targets #319's branch until those merge and then targets main.

## What changed

- **A sponsor's ad in a slot** (board AdFormats):
  - the "Sponsored" pill, which the slot draws so no creative can drop it;
  - the checked picture with its alt text. Storage gives a signed address only for a picture that passed the check;
  - the sponsor's one line in the reader's language, and "From <sponsor>";
  - "Visit the site", which opens in a new tab with `rel="sponsored nofollow noopener noreferrer"`. Screen readers hear "(opens in a new tab)";
  - an optional discount code shown as real text, with a Copy button and a polite "Copied." (or a plain note when the browser refuses).
- **"Why this ad?"** now opens with who paid: "A sponsor, <name>, paid for this ad, and a person on our team checked it is suitable for every reader." The page match and the no-personalisation promise follow, as before.
- **"Sponsored by"** (criterion 3):
  - on a category's list, under its heading;
  - on a contest's own page (/c/<slug>), above the page.
  
  The sponsor's name links to its site when the campaign gave a link. The line shows nothing while it loads or when nobody sponsors the page. The list's contents and order never change.
- **Database:** `sponsor_credit()` gains a `contest_page` kind keyed by the page's address, because a visitor's contest page doesn't know the contest's ID. An archived page gets no credit.
- **Text:** new `ads` keys in both languages.
- **Records:** the ads README and the code tour.

## How it was tested

- Database test `272-sponsor-credit-by-page` (5 tests):
  - a visitor on the contest's page gets the sponsor;
  - the contest's ID still works;
  - another page, an archived page and an ended campaign give nothing.
- Unit test: "Why this ad?" names the sponsor.
- The new e2e test `sponsored-ads.spec.ts`:
  - Discover shows the sponsor's ad, with the link marked sponsored and opening in a new tab;
  - the code copies to the clipboard;
  - "Why this ad?" names the sponsor;
  - Poetry's list says "Sponsored by";
  - axe passes and nothing scrolls sideways on both pages at 390, 768 and 1440 px, light and night, in Romanian and English.
- `ads`, `discover` and `landing-pages` e2e ran unchanged.

## Local check run

LOCALRUN

## By hand

- Nothing to set.

## Follow-ups

- Part c: the sponsor reports (daily totals, CSV).
- Booking a campaign into a named slot comes in part e, as the board shows.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
