<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #118

Bundle 14 SPONSORS, part b2: Staff › Sponsors, the screens for the campaigns built in part b1 (#318) (S1-E12-02). This branch sits on top of #318, so it targets that branch until #318 merges and then targets main.

## What changed

- **Staff › Sponsors** (`/staff/sponsors`), in the staff menu after Contests, for owner and admin:
  - the principles from the board (no tracking, nothing for children's pages, a person reviews every ad);
  - the review queue, oldest first. Each card shows the creative, the words in both languages, the link and four checks. "Approve" is refused until every check is ticked, and "Send back" needs a note;
  - the campaign list, showing each campaign's sponsor, placement, dates and status (Draft, In review, Sent back, Approved, Live or Ended);
  - the sponsors (add one, or rename it);
  - "Never advertised". The fixed categories carry a "Fixed" label and have no Remove button. Staff can add a category, or remove one that isn't fixed if they give a reason.
- **The campaign form** (`/staff/sponsors/campaigns/new` and each campaign's own page):
  - the sponsor, the name, the placement and, for a "Sponsored by" credit, the category or contest it sponsors;
  - the page targeting: categories, tags and language. The six things never used to choose an ad are listed under them;
  - the creative upload, which goes through the picture check like every upload, and its result;
  - alt text and one line of text in Romanian and English, side by side from 768 px, each marked with its language and with a counter;
  - the https link, an optional discount code and the dates;
  - "Save draft" and "Send for review". What's still missing stays listed on screen, and a note warns that saving an approved campaign sends it back to review;
  - "End campaign", which needs a reason.
- **Upload:** `uploadSponsorCreative()` sits beside the other picture uploads (5 MB, the `sponsor-creatives` bucket). Moderators see the new picture kinds by name.
- **Text:** a new `sponsors` namespace in both languages, plus the menu entry.
- **Records:** a README for `src/features/sponsors/` and a code tour section.

## How it was tested

- The new e2e test `sponsors-admin.spec.ts`:
  - an admin adds a sponsor, sets up a Poetry "Sponsored by" campaign with dates and sends it for review;
  - approving is refused until every check is ticked, and the campaign then shows as Live;
  - the fixed Alcohol row has no button, and Weight loss can be removed;
  - axe passes and nothing scrolls sideways at 390, 768 and 1440 px, on both the page and the form.
- `staff-shell.spec.ts` and `epic-s1-e11.spec.ts` now include the Sponsors menu entry.

## Local check run

LOCALRUN

## By hand

- Nothing to set.

## Board mismatches

- The board's form has a Market row marked OPEN. It's left out, as in part b1.

## Follow-ups

- Part b3: how a sponsored ad looks on the pages (picture, line, link, discount code with a copy button), and "Sponsored by" on category lists and contest pages.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
