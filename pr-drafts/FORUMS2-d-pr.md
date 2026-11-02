<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #74

Bundle 10 FORUMS-2, part d: forum signatures, and moderators' requests to change a signature or a space's banner picture (S1-E8-08).

## What changed
- **A signature in Settings (criterion 1).** A new "Forum signature" section after Profile picture:
  - plain words, at most 300 characters and three lines, with live counts read out politely; a limit passed is refused before saving, and the database checks the same;
  - one still picture (JPEG, PNG or WebP, up to 1 MB) while picture uploads are on, checked like every other picture (rule 19) and shown to others only once it passed; "Remove picture" deletes its file;
  - a moving PNG or WebP is refused in words ("A signature picture can’t move"). The app redraws every picture on a canvas anyway, which keeps only a still frame, and the server check holds a moving file that reached Storage some other way.
- **Where it shows.**
  - On the writer's profile, as board 6.1 draws it: the "Forum signature" card in the side column.
  - Under each of the person's live posts, from 768 px up only (criterion 2; Q25): a dashed rule, a 40 px picture and 13 px words.
  - The signature belongs to the profile: reporting the profile covers it, and a moderator who hides the profile hides the signature too. No new reportable type.
- **A moderator's change request (criterion 3; Q29).**
  - "Ask for a change" on the staff account page (signature) and on a space's Banner picture card (for our moderation team only). The moderator writes why; the request is in the audit log.
  - The owner gets a required notification that quotes the reason and opens Settings › Forum signature or the space's settings, where a notice says why and by when.
  - Changing it in time closes the request. Otherwise a job (every 10 minutes) removes it after 24 hours and sends a statement of reasons (DSA art. 17).
- **Data rights.** The requests are in Download my data and deleted with the account; `docs/retention.md` has the row.
- **Docs:** `docs/code-tour.md`, the forums README, `docs/board-fixes.md` and `docs/retention.md`.

## How it was tested
- `supabase/tests/database/230-forum-signatures.test.sql` (38 tests) covers:
  - the limits and trimming, a read-only account refused, Settings reading it back;
  - the profile and a post showing it, with no user ID;
  - each storage policy allowed and denied, the uploads switch, "not yours", the replaced file handed back;
  - the change request: staff only, nothing to change, one open at a time, the notification, closing on change, the job removing an unchanged signature (with its statement of reasons) and an unchanged banner picture.
- Unit: the moving-picture check (PNG and WebP), the signature counter, the server's still-picture rule, and the notification words and links.
- `e2e/forum-signatures.spec.ts`:
  - the writer saves a signature; a fourth line is refused;
  - a moving WebP is refused and a still PNG passes;
  - the profile shows it; a post shows it at 1440 px and hides it at 390 px;
  - a moderator asks for a change; the writer's notification opens Settings with the notice;
  - axe on Settings (with the doodle check) and on the profile at 390, 768 and 1440 px, light and night, ro and en.

## Local check run
LOCALRUN

## By hand
- Nothing. The bucket and the cron job come from the migration, and there is no seed change.

## Board mismatches
Each is also in `docs/board-fixes.md`:
- Board 5.2's story link in the signature line is shown as plain text: links in signatures aren't clickable (see the questions).
- Settings (6.3) has no signature panel on the board; it is a new section after Profile picture.
- Board 6.1's drawn moon is a placeholder; the card shows the person's own picture once it passed its check.

## Questions for Robert (built as proposals)
- **Links in signatures aren't clickable.** A signature repeats under every post, so a link there spreads fast and is a favourite for spam. Tell me if you want links to work (with `nofollow ugc`, like posts).
- **A moderator's request is a notice, not a sanction.** It doesn't count against the account; only the removal after 24 hours sends a statement of reasons.

## Follow-ups
- The profile avatar's open-book doodle sits over the initials (board 6.1 draws it on the picture's top edge). `writer-profile.spec.ts` doesn't run the doodle check on the profile, and the new spec doesn't either; moving the doodle a little higher would let both check it.
- `formatStatNumber` gives "19K" instead of "19k" on the build machine's Node 22 (CI uses Node 24 and passes); not touched here.
- Part e: ranks (S1-E8-09) and the full test run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
