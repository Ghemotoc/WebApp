# ADMIN-2f plan: bans (brief section 6)

Split in two pull requests.

## f1: closed for good, the wording, emails
- Closed, never deleted: a banned account's content is hidden from everyone but staff (one helper used by the public reads, or by the existing account_state() gate), its deletion request is refused while the ban stands, and the nightly purge skips it; its data stays under the retention schedule.
- Terms of use and community guidelines drafts (en and ro), [lawyer to check]: the Pictures paragraph and the Closed for good paragraph from the brief. Remove the old Sightengine wording from 01 and 03 (and the privacy notice's processor list, which names it too).
- banned_email_hash() normalises first: lower case, trim, drop a +tag, and drop dots for gmail.com and googlemail.com (googlemail.com becomes gmail.com). Staging's existing banned hashes are re-made where possible (by-hand note: they can't be, since the email isn't kept; only hashes made from emails that change under the new rule are affected).
- Disposable email domains: content/disposable-email-domains/ holds the CC0 list from github.com/disposable-email-domains (date and source in its README); a migration loads it into disposable_email_domains (platform table, read by nobody, function only). The sign-up trigger refuses them, and email_domain_allowed(email) lets the sign-up form say so in plain words before it sends. A setting disposable_email_allow lists domains to let through.

## f2: returning users
- server/scrambled-ip.ts at sign-up: the sign-up context token carries the scrambled IP; the sign-up trigger keeps it on a new sign_up_ips row (30 days, Q48).
- A sign-up sharing a scrambled IP with an account banned in the last 30 days opens a moderator case "Possible returning user" (never a block: schools share IPs).
- Moderators can link two accounts in a case ("Possible returning user" action), with a reason, logged; the case page shows the link.
- No phone numbers, no device marker.

## f2 details (worked out 3 Nov 2026)
- /api/signup-context also returns ipToken "v1.<scrambled now>.<period now>.<scrambled last month>.<period last month>.<seconds>.<sig>" (SIGNUP_CONTEXT_SECRET signs it; IP_SCRAMBLE_SECRET scrambles). Two periods because the key changes monthly and the window is 30 days. The country token stays as it is.
- sign_up_data.signup_ip -> verified_signup_ips(token) in create_profile_from_sign_up(); sign_up_ips row (user_id, ip, period, created_at), kind staff, moderation view, purged after scrambled_ip_keep_days.
- On a ban: banned_ips rows copied from the account's sign_up_ips and picture_checks scrambled IPs (kept 30 days from the ban). Limitation: an account with no IP from the last 30 days leaves none.
- New sign-up whose IP (either period) matches a banned_ips row of a live ban from the last 30 days: a case (source 'returning_user', item profile, tier two_days) on the new account, with the banned account named in case_links. Never a block.
- Case page: "Possible returning user" panel shows the linked account; moderator action "Link as possible returning user" on any profile case: pick by username, reason, logged (admin_link_returning_user). Removing a link logged too.
