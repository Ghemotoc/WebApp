<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 12 ADMIN-2, part f1, from Robert's brief of 2 Nov 2026 (`bundle-12-pictures-bans-avatars-brief.md`, section 6, from his 08:20 and 08:21 messages): bans close an account for good, and banned people find it harder to come back. Part f2 adds the returning-user flag (scrambled IP at sign-up).

## What changed

- **Closed for good.** A ban now hides the account's profile, stories, comments, forum posts and the forum threads only it posted in, from everyone but staff. They are `moderated_items` rows linked to the ban (new column `sanction_id`), so every public read that already asks `is_moderated_away()` leaves them out. A thread other people replied in stays, and an item a moderator had already hidden keeps its own row. Nothing is deleted: the nightly `purge_closed_accounts()` skips an account under a live ban, so the data stays as evidence. Lifting the ban (on appeal, for example) brings back exactly what it hid. Bans that already exist are applied by the migration. The ban's explanation on the staff sanction form says so, in en and ro.
- **Emails normalised before they are banned.** `normalised_email()`: lower case, trimmed, no +tag, and for Gmail no dots (googlemail.com counts as gmail.com). `banned_email_hash()` hashes that form, so "Ana.Pop+2@googlemail.com" can't sign up after "anapop@gmail.com" was banned.
- **Throwaway email domains.** `content/disposable-email-domains/` holds the public CC0 list (github.com/disposable-email-domains, 10,123 domains, copied 3 Nov 2026) with a README on its source and how to refresh it. A migration loads it into the new platform table `disposable_email_domains` (staff who may view the settings can read it). The sign-up trigger refuses such a domain or its subdomains; the sign-up form asks `email_domain_allowed()` first and says "This email address comes from a service that hands out throwaway addresses…". The setting `disposable_email_allow` lets a wrongly listed domain through.
- **Legal drafts (en and ro), [lawyer to check]:** the Pictures paragraph from the brief in the terms of use and the community guidelines (replacing the "[Founder to confirm: no nude or sexual pictures even in 18+ stories]" line), the Closed for good paragraph in both, and Sightengine removed from the terms, the guidelines and the privacy notice's processor list. The terms' picture paragraph now says what really happens: Arachnid Shield on every picture, a moderator on every picture in an All ages or 13+ story and every picture from a writer under 16.
- **Records:** `docs/retention.md` (a banned account, **proposal**), `docs/decisions.md`, `docs/for-the-lawyer.md` (Sightengine gone, closed for good), `docs/code-tour.md`.

## How it was tested

- Database test 251 (28 tests): normalising (Gmail and another provider), the same banned hash for two ways of writing an address, a banned person's +tag sign-up refused; the list loaded, a throwaway domain and its subdomain refused, an ordinary domain allowed, the trigger's refusal with its hint, the allow setting, anon may ask; the list's read policy (allowed and denied); a ban hides the profile, a story, forum posts and an own-only thread, keeps a replied thread and a moderator's own hide, the profile can't be opened; the purge skips the banned account; lifting brings exactly those back with the reason. Test 021 covers the new table.
- e2e `e2e/sign-up.spec.ts`: a throwaway address is refused in plain words and nothing is stored. The sanctions, appeals, statements, moderation queue, user management, abuse images and S1-E10 epic specs run again with bans now hiding content.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Staging's banned email hashes made from an address with capitals, a +tag or Gmail dots no longer match (the email itself is never kept, so they can't be made again). The seed's `banned_user` is unaffected. If someone was banned on staging with such an address, ban the account again from Staff › Users once it signs up.
- Ask the lawyer about the [lawyer to check] wording and how long a banned account's data may be kept.

## Board mismatches

None: no new screens.

## Questions for Robert

- **How long is a banned account kept?** I kept it while the ban stands (it is never deleted, as the brief says), with the retention row marked as a proposal for the lawyer. A fixed period (for example 5 years, like the abuse image evidence) would be easy to add.
- **Private messages stay.** A ban hides the profile, stories, comments and forum posts, but not messages the person already sent, so the people they wrote to can still read and report them. Say if you want those hidden too.

## Follow-ups

- Part f2: the scrambled IP at sign-up, the "Possible returning user" flag for moderators and linking two accounts in a case.
- The staff Stories page still says "deleted by the writer" for any deleted story; a banned writer's stories aren't deleted, so it doesn't show for them, but the wording could name the reason once more reasons exist.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
