<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of bundle 12 ADMIN-2, part e1b, from Robert's brief of 2 Nov 2026, 08:39 (`bundle-12-pictures-bans-avatars-brief.md`, sections 2 and 3). It changes S1-E10-05 (picture check) and adds Moderation › Pictures to check. Part e1a (#293) set the rules.

## What changed
- **Who waits for a moderator.** Once the automatic check passes it, every picture in a story rated All ages or 13+ (whoever uploaded it) and every picture from someone under 16 is held instead of going live. Nobody but the uploader and staff sees it until a moderator decides. Adults' pictures in 16+ and 18+ stories, and adults' profile pictures, still go live at once. Lowering a story to All ages or 13+ sends its live pictures back to a moderator.
- **Moderation › Pictures to check** (`/staff/pictures`, in the menu for the moderation team). Each picture is shown large with no download button, the uploader by username and age group only, its story and rating and how long it has waited. Three buttons, each with an icon and a word as well as a colour:
  - **Approve** (green): the picture shows at once.
  - **Approve and raise the rating** (yellow): "What does the picture show?" Nudity or explicit drawn content of adults makes the story 18+; suggestive without nudity at least 16+. It uses `admin_raise_story_rating()`, so the writer gets a statement of reasons, and ratings only go up. It isn't offered for pictures outside a story, for stories owned by someone under 16, and 18+ isn't offered for a picture from someone under 18 (the builder's proposal in the brief).
  - **Reject** (red): "What does this image show?" from an admin-editable list (setting `picture_reject_reasons`: photograph, photographic sexual image, real person, celebrity, sexual image of a minor, gore, hate, other). The picture is removed and the uploader gets your message in their own language as their statement of reasons (DSA art. 17), with the notification and email every moderation decision already sends, and the appeal route.
- Every decision closes the picture's case in the moderation queue too, and goes to the audit log.
- Staff › Settings now lists `picture_allowed_kinds` and `picture_reject_reasons`.
- The Canva return page's "still being checked" line now says a person may take up to two days, since a Canva cover on an All ages or 13+ story waits for a moderator.

## How it was tested
- Database: new `248-pictures-to-check` (22 tests: who waits and who doesn't; the list for moderators only, with the age group; green; lowering a rating; yellow raising to 16+ with the writer's statement, 18+ refused for an under-18's picture, no raise for a profile picture; red needing a known reason, removing the picture and naming the picture rules; support can't decide). `185-chapter-pictures` now shows the clean picture waiting in an All ages story and a moderator approving it.
- Unit: `lib/pictureRaiseOptions.test.ts`.
- End to end: new `pictures-to-check` (a character portrait in the All ages seed story waits; the moderator sees it large with the age group and story and no download; Reject asks for the reason and note, previews the message, removes it and stores the statement; Approve and raise the rating makes the story 16+; axe at 390, 768 and 1440 px, light and dark, ro and en). The chapter picture, drawing, Canva cover and Story world portrait specs now expect the picture to wait, and a moderator approves it (`e2e/support/pictures.ts`) before readers look.
- Screenshots of the page and the Reject form at 1440 and 390 px, checked by eye (the long guidelines link in the preview now wraps on phones).

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
- Nothing on staging: the migrations arrive with the merge.
- Optional: read the moderator guidance line and the rejection message in Romanian (`pictures` in `moderation.json`). The rejection message is your 08:21 text plus "(it shows: …)", so it names the rule broken.

## Board mismatches
- No board draws Pictures to check; it follows the moderation queue's plain staff layout.

## Questions for Robert
1. **The rejection email.** The uploader gets the standard required email for a moderation decision ("Our moderation team made a decision… open your notifications"), and the notification opens your rejection message as the statement of reasons. Putting your full text in the email itself needs a new notification kind; happy with it as is?
2. **Classics and staff uploads.** Classics are All ages, so a cover an admin uploads for a classic also waits for a moderator. That follows "whoever uploaded it"; say if staff uploads should skip the queue.

## Follow-ups
- Part e2: "Sexual image of a minor" gets the police description box, the file deleted at once and the evidence kept; the picture review permission and the download alert.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
