<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

This is bundle MARKETS-1 from the builder's queue: stories S1-E2-20 to S1-E2-23, from the brief `05_product-and-build/builder/2026-11-06_bundle-markets-1-country-ages_brief.md`. Robert gave the go-ahead on 6 Nov 2026 at 10:19 UTC ("Yes, they should know the country").

## What changed

**Age rules by country (S1-E2-21)**
- New table `country_age_rules`, one row per country, or per region where a region has its own law. Each row holds:
  - the minimum age to join;
  - the age below which a parent or guardian must consent;
  - the age below which sign-up is blocked (blank means never);
  - the source, the date it was checked, confidence, status and notes.
- Anyone can read it, signed out included. Only owner and admin can write it, through `admin_*` functions that write the audit log.
- 57 seeded rows from the 6 Nov research, all marked "to verify". A ZZ row is the default for countries not listed: 13 to join, consent below 16.
- Quebec, Florida, Georgia, Mississippi and Tennessee have their own region rows. Australia blocks sign-up below 16 and the US below 14 (as the research seed says).
- Staff › Settings › Age rules by country has a filter for rows to check again (low confidence, or checked over six months ago), an editor that needs a reason for each change, and every change in the audit log.

**Country at sign-up and in Settings (S1-E2-20)**
- Sign-up asks for the country you live in. It's pre-filled from the connection's country, which is only a suggestion, and the region is asked where one has its own law.
- Settings › Profile shows the country and lets you change it. The new country's rules are checked before the change saves.
- Members who never chose a country are asked once.

**The age gate follows the country (S1-E2-22)**
- The year-of-birth check, the parental consent step and the refusal message read the person's country rule instead of a fixed 16.
- The month is also asked at a country's own ages (Quebec's 14).
- The 16 split for safety features (spaces, messages with adults, picture review, ratings) stays the same everywhere, as the brief says.

**Legal pages by country (S1-E2-23)**
- The terms and the privacy notice (en and ro) now say the consent age depends on where you live.
- Both end with "Your country", showing your country's ages first, and "Ages by country", the full table.

**Other changes**
- `docs/decisions.md` logs that this replaces "country comes from the connection; people are not asked" (Q20).
- `docs/retention.md`, `docs/code-tour.md` and the feature READMEs are updated.
- Fixes found by the full run:
  - an edit button in the age rules table and the "Show: <shelf>" buttons in Staff › Settings › Discover pushed the page sideways at 390 px in Romanian; they now wrap or use a short visible label;
  - the legal-text marker list now points at the reworded consent lines.

## How it was tested

`npm run checks` on this branch:
- Lint, typecheck, types:check, unit tests (1,579), db reset, schema check and pgTAP passed.
- The e2e suite ran 1.8 hours: 2,490 tests passed and 14 failed, in specs this bundle mostly doesn't touch (Atlas, class stories, downloads, search, privacy settings and others).
- I re-ran each spec file with a failure in full on a fresh database, and all of them passed (213 tests). The failures came from leftover state and load late in the long run, not from this change.
- New tests:
  - pgTAP `308-country-age-rules` (allowed and denied tests for each policy, the rules' outcomes, the audit);
  - Vitest `src/lib/age-rules.test.ts` (the same examples as pgTAP 308);
  - e2e `country-ages.spec.ts` (asked once, Australia refuses a 14-year-old, staff edit with a reason, the legal page by country, axe at 390 px in Romanian).
- `021-signed-out-reads` now expects the public age rules.

## By hand (staging)

1. After the migrations reach staging, run `supabase/staging-topups/markets-1.sql` in the SQL Editor. It marks the 16 seed personas as having chosen their country, so they aren't asked. The last result should show 16.
2. The new terms and privacy notice text needs the usual lawyer read before a new legal version is published.
3. Every age rule is "to verify" until a lawyer confirms it (GO-LIVE).

## Follow-ups

- Someone whose connection is in a closed country can still sign up by choosing another country. That needs a product decision (trust the choice, or block on the connection too).
- The markets intro text in Staff › Settings still says "Romania opens first", which predates the 6 Nov launch decision.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
