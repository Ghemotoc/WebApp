<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of bundle 12 ADMIN-2, part e2b, from Robert's brief of 2 Nov 2026 (`bundle-12-pictures-bans-avatars-brief.md`, section 4, from his 08:23 and 08:26 messages): suspected child sexual abuse images.

## What changed

**When it applies:** a picture reviewer presses red with "Sexual image of a minor", or Arachnid Shield matches a picture.

- **The image is never kept.** Its file is deleted from Storage at once: by the picture check with the uploader's own token on a match, by the reviewer's own sign-in after a red decision, and by the storage sweep, which now lists such files with no grace time and is started straight away. There is no quarantine bucket. S1-E10-10's six months' preservation of a matched file is replaced.
- **The evidence is kept** in a new table `abuse_image_evidence` (safeguarding staff only): the case and its reference, the account, when it was uploaded and found, the scrambled IP address and the month of its key, the SHA-256 hash of the file and the moderator's description for the police. 5 years (setting `abuse_image_evidence_keep_years`), longer under a **legal hold** that safeguarding staff set with a reason. The nightly `run-retention-jobs` purges it after that (`purge_abuse_image_evidence()`).
- **The hash and the scrambled IP.** `server/picture-check.ts` adds the file's SHA-256 and the uploader's IP (from `CF-Connecting-IP`) to the signed verdict. The IP is scrambled before it leaves the function: HMAC with a key that changes every month (the month's key is the HMAC of "2026-11" with `IP_SCRAMBLE_SECRET`), in the new `server/scrambled-ip.ts` that part f will reuse for sign-ups. `picture_checks` keeps both; the scrambled IP only when the uploader sent the request (never a staff member's), and `blank_old_scrambled_ips()` blanks it after 30 days (Q48). Without the secret no IP is kept at all.
- **The red form:** choosing "Sexual image of a minor" shows a warning of what will happen and the required box "Describe the image in a few words for the police." The uploader's message for this reason no longer invites them to upload another picture. `admin_reject_picture()` gains `police_description` and `account_message`: it keeps the evidence, moves the case to safeguarding and closes the account for good (a ban with its own statement of reasons on the law), unless it is a staff account.
- **A match:** the account stays open until a safeguarding moderator closes it from the case page (an automated match is never the only reason an account is closed).
- **The safeguarding case page** gets "Evidence about the image": the facts as label rows (the scrambled IP itself is not shown; it goes in the evidence pack), Change the description, Put a legal hold on it / Lift the legal hold, and Close the account for good. The evidence pack carries the evidence.
- **Safeguarding steps:** "Report a child sexual abuse image to the police first; they pass it on (for example to DIICOT)" on the case page checklist and in `docs/runbooks/safeguarding.md`, marked [lawyer to check] in the runbook.
- **Records:** `docs/retention.md` (evidence row, IP row rewritten), the privacy notice drafts in en and ro (5 years, scrambled IP kept with the evidence), all marked [lawyer to check]; `docs/decisions.md`, `docs/code-tour.md` and the moderation README.

## How it was tested

- Database test 250 (30 tests): hash and scrambled IP kept, never a staff member's IP; the description required; evidence, safeguarding move, ban and both statements on the law; the sweep lists the file at once; who may reach the file to delete it (allowed and denied); the evidence's read policy (allowed and denied); the match path, closing the account and describing it; the evidence pack; legal hold; the purge and the IP blanking. Test 164 now expects no preservation on a match; test 021 covers the new table.
- Unit: `server/scrambled-ip.test.ts` (monthly key, same value in a month, nothing without an address or secret) and `server/picture-check.test.ts` (hash and scrambled IP signed, never the raw address; a match's file deleted with the caller's token; nothing deleted otherwise).
- e2e `e2e/abuse-images.spec.ts`: a `_match` upload's file is gone at once with the evidence kept and the account open; red with "Sexual image of a minor" needs the description, then the file is gone, the evidence kept and the account banned; the safeguarding moderator rewrites the description and sets a legal hold; axe on the case page at 390, 768 and 1440 px in both themes and languages.
- Screenshots of the red form and the evidence panel at 1440 and 390 px, checked by eye.

## Local check run

LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand

- Set `IP_SCRAMBLE_SECRET` in Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets (a long random value, never in the repository; keep a copy in the password manager, because the police can only match an address with it). Until it is set, no IP address is kept.
- Ask the lawyer about the [lawyer to check] points below.

## Board mismatches

None: staff screens use plain components.

## Questions for Robert

- **A match closes the account only when a safeguarding moderator says so.** I didn't close accounts automatically on an Arachnid match, so a person always decides (DSA art. 17 asks us to say when a decision is automated). Say if you want it closed at once.
- **The description for a match** starts with a stand-in ("Matched a known image on Arachnid Shield’s list…"), because the file is deleted before anyone can look. The safeguarding moderator can rewrite it from what Arachnid reports.
- **The person is told why.** Both statements of reasons (picture removed, account closed) are sent, as the terms promise. Whether telling a suspect could warn them before the police act is one for the lawyer.
- **[lawyer to check]:** the 5 years and the legal hold; keeping the scrambled IP longer than 30 days for these cases; reporting to the police first rather than a hotline as well.

## Follow-ups

- The nightly account purge now skips an account with evidence (it stays closed; the evidence's foreign key is `restrict`). Part f (closed, never deleted) covers banned accounts in general.
- Part f reuses `server/scrambled-ip.ts` for sign-ups and the 30-day banned-IP flag.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
