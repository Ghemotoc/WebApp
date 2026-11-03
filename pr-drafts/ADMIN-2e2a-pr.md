<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Part of bundle 12 ADMIN-2, part e2a, from Robert's brief of 2 Nov 2026, 08:39 (`bundle-12-pictures-bans-avatars-brief.md`, section 5, from his 08:29 message). Part e2b follows with section 4 (suspected child abuse images).

## What changed
- **The picture review permission.** An owner or admin ticks "Picture review" on Staff › Roles. The database refuses it for an account under 18 (or whose age is unknown) and for anyone marked as an intern. Only holders:
  - open Moderation › Pictures to check;
  - see a picture on a moderation case (others read what the check flagged and a line saying why there is no picture);
  - decide a picture case anywhere, the queue and appeals included;
  - read a waiting picture's file at all: every picture bucket's storage policy now asks for it.
- **The intern marker.** A new "Intern (never reviews pictures)" box on Staff › Roles (`staff_interns`, `admin_set_intern()`), with a reason and an audit log entry like every staff change. Marking someone an intern takes picture review away in the same step.
- **The alert when staff open an uploaded picture.** Every time a staff screen hands someone a picture's original file (Pictures to check, a picture case), it goes to the audit log as `picture.opened` and alerts every owner at once:
  - in the app, as a notification that can't be switched off;
  - by email, always sent;
  - on the staff home page, in a panel listing who opened pictures in the last seven days.
  - The list of people alerted is the setting `picture_open_alert_handles` (Staff › Settings; empty means owners only), so a chief of legal can be added later.
  - To avoid a flood during a review session, each recipient gets one alert per staff member per hour, and reloading a page doesn't log the same picture twice within ten minutes. The audit log keeps every opening.
- Seed and staging: the owner, admin and moderator personas hold picture review.

## How it was tested
- Database: new `249-picture-reviewers` (25 tests: refused for under-18s and interns, intern marking takes it away and both are logged, the marker's read policies allowed and denied, a moderator without it can't list, read, see or decide pictures, a reviewer can, the audit log and alert once per hour, the setting adds a recipient, the home panel only for recipients). `021-signed-out-reads` lists the new table.
- Unit: the existing staff, moderation and notification suites.
- End to end: new `picture-reviewers` (an admin marks an intern and picture review is refused with the reason; a moderator without it is told the page isn't for them; a reviewer opening Pictures to check shows on the owner's staff home and alerts them; axe on the staff home at 390, 768 and 1440 px, light and dark, ro and en), plus staff roles, staff shell, Pictures to check, picture check and notifications.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
- Staging: run `supabase/staging-topups/ADMIN-2e2a.sql` (gives the owner, admin and moderator personas picture review; safe to run twice).
- Staging and production: tick "Picture review" on Staff › Roles for each real moderator who checks pictures. Without it, Pictures to check is closed to them.

## Board mismatches
- No board draws these controls; they follow Staff › Roles and the staff home's plain layout.

## Questions for Robert
1. **Viewing counts as opening.** Staff have no download button, so the only way they get a picture's file is by looking at it on Pictures to check or a case. I read your "every download or fetch" literally: each look is logged and alerts you, grouped to one alert per staff member per hour. If you only want alerts for something closer to a download, say so and I'll narrow it.
2. **Who is alerted.** Every owner plus the setting's usernames. Should admins be alerted too, or only when named?

## Follow-ups
- A staff member could still ask Storage for a file directly with an address they already have, outside the screens; that read is allowed by the storage policy but not logged. Logging it would need the files to be served through a staff function holding the service key. Worth doing before minors go live.
- Part e2b: suspected child abuse images (the police description box, the file deleted at once, the evidence kept five years with a legal hold).
- The moderation queue's case page still decides a picture with the usual actions; the yellow "approve and raise the rating" there comes in part 12h.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
