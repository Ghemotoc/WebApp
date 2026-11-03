# ADMIN-2e2b plan: suspected child sexual abuse images (brief section 4)

Source: /mnt/project-files/builder/bundle-12-pictures-bans-avatars-brief.md, section 4 (Robert, 2 Nov 2026, 08:23 and 08:26).

## When it applies
- A picture reviewer presses red (Reject) with "Sexual image of a minor".
- Arachnid Shield matches a picture (isKnownAbuseMatch in the signed verdict).

## Server (server/picture-check.ts)
- Works out the file's SHA-256 (crypto.subtle) and adds `fileSha256` to the signed verdict.
- Scrambles the caller's IP (CF-Connecting-IP) with a keyed hash whose key changes every month:
  key = HMAC(IP_SCRAMBLE_SECRET, "YYYY-MM"), value = HMAC(key, ip). Adds `uploaderIp` ({ value, period }) only when the caller is the uploader, the header is there and the secret is set. New file server/scrambled-ip.ts (12f reuses it for sign-ups). Never logged.
- On a match, deletes the file from Storage straight away with the uploader's own token (new delete policy below).

## Database (migration 20261222100001/2)
- picture_checks: `file_sha256 text`, `uploader_ip_scrambled text`, `uploader_ip_period text`; record_picture_check stores them. A nightly job blanks the IP after 30 days (Q48).
- New table `abuse_image_evidence` (kind: staff): case_id (set null), case_reference, user_id (the uploader, restrict), picture_id (set null), picture_kind, uploaded_at, reported_at, source (moderator | known_image_match), file_sha256, uploader_ip_scrambled, uploader_ip_period, description, described_by_user_id, keep_until (5 years), legal_hold, legal_hold_reason, timestamps. RLS: select for safeguarding staff only. Written only through functions.
- `record_abuse_image_evidence(picture, source, description)` (internal): writes the row, marks the picture removed-pending-file, starts the storage sweep at once.
- record_picture_check: on a match, the evidence row (description "Matched a known image on Arachnid Shield's list.", editable), preserve_until null (the file isn't kept any more; replaces S1-E10-10's six months).
- admin_reject_picture gains `police_description` (required for "Sexual image of a minor"): evidence row, case moved to safeguarding, uploader's account closed for good (ban, with its own statement of reasons) unless it is a staff account.
- `admin_close_account_for_abuse_image(case_id, note)`: for a match, the safeguarding moderator closes the account from the case page.
- `admin_abuse_image_evidence(case_id)`, `admin_describe_abuse_image(evidence_id, description)`, `admin_set_evidence_hold(evidence_id, hold, reason)`: safeguarding permission, logged.
- Storage: delete policy `abuse_image_files_delete` on every picture bucket for files with an evidence row (uploader or picture reviewer); storage_files_to_sweep lists those files with no grace period.
- case_item_content's picture branch adds the evidence, so the evidence pack carries it.
- Purge job `purge-abuse-image-evidence` (daily): evidence past keep_until without a hold; scrambled IPs older than 30 days on picture_checks.

## Screens
- RejectPictureForm: a required box "Describe the image in a few words for the police." when "Sexual image of a minor" is chosen, plus a plain warning: the file is deleted at once, the account closed for good, evidence kept 5 years.
- After the reject, the page deletes the file (Storage remove) as a belt and braces step.
- Safeguarding case page: AbuseImageEvidencePanel (hash, uploaded and reported times, whether a scrambled IP is kept, description editable, keep until, legal hold switch with reason, "Close the account for good" for a match).

## Docs
- docs/retention.md rows (evidence 5 years plus hold; scrambled IPs 30 days), marked [lawyer to check].
- content/legal privacy notice drafts en and ro: the evidence paragraph, [lawyer to check].
- docs/runbooks/safeguarding.md: report to the police first, who pass it on (DIICOT), [lawyer to check].
- code-tour, moderation README, decisions row, by-hand: set IP_SCRAMBLE_SECRET in Cloudflare.

## Tests
- DB 250-abuse-image-evidence: both paths, RLS allowed and denied, hold, purge, ban, staff uploader, sweep listing.
- Unit: sha256 and scrambled IP in the payload; delete on match.
- e2e pictures-to-check: red with "Sexual image of a minor" needs the description; afterwards the file is gone, the account is banned, the safeguarding case has the evidence.
