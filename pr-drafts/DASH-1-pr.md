## Story
DASH-1: the staff dashboard, grouped side menu and "Sign in again"

Not a backlog story: Robert asked for it in the Builder thread on 6 Nov 2026, 18:32 to 18:34 UTC ("There's not like a real dashboard where I can see things at a glance, sections that I can go through, nothing"), and picked "After MARKETS-1, before waitlist" on his decision card. No GitHub issue to close.

## What changed
- **Database** (`…_dash1_01_staff_dashboard.sql`, no new table):
  - `staff_dashboard()` returns counts only, one key per area the caller may view (`staff_may()`). It covers reports waiting and overdue, pictures to check, open appeals, teacher checks, open and overdue data requests, open support tickets, sign-ups in the last 7 days, and failed calls and browser errors in the last 24 hours.
  - Safeguarding cases count only with that permission.
  - It refuses (42501) outside a staff session.
  - It writes nothing to the audit log, because no row leaves it.
- **Session check:** `my_staff_session_ended()` is true for staff whose session is older than `staff_session_hours` (12).
- **Front page** (`/staff`): an "At a glance" section of tiles, each linking to its area. Overdue work and failures use the warning colours plus a "!", so colour isn't the only signal. Below that, the area cards are grouped by menu group.
- **Side menu:** the area links move out of the top bar into `StaffSideMenu`, in five groups (Safety, People, Content, Website, System). Under 1024 px the menu sits behind a "Menu" button, which closes again when a link opens a page.
  - The top bar is no longer a navigation landmark, so there is still exactly one navigation named "Staff".
  - `staffAreaPages` is reordered into group order, so the menu, cards and footer agree.
- **Session ended:** `StaffSessionEnded` ("Your staff session has ended") replaces the empty admin site. "Sign in again" signs out here, clears the cached staff access and opens `/sign-in?next=/staff`.
- **Log-in page:** it follows `?next=` only to a path on this site (`features/auth/lib/nextPath.ts`). `//host`, `/\host`, control characters and full URLs all go home.
- **Locales:** new en and ro keys (menu groups, Menu, session ended, dashboard tiles). The stale `home.comingAreas` line is removed, and `home.noAreas` no longer mentions the 12-hour session.
- **Docs:** decisions row, architecture 1.8.2, code tour, staff README and the "admin shell" section of `supabase/README.md`.

## Acceptance criteria and tests
| Criterion | Test |
| --- | --- |
| Counts per area, only areas the role may view; refused for a member, a visitor and an expired session | pgTAP `309-staff-dashboard` (16) |
| Moderator sees moderation tiles and not support's; support sees tickets and data requests and not reports; the editor sees no numbers | `e2e/dash-1.spec.ts` |
| A tile opens its area | `e2e/dash-1.spec.ts` |
| Side menu: five groups on wide screens; behind "Menu" on a phone, closing after a link | `e2e/dash-1.spec.ts`, `staffAreas.test.ts` |
| An expired session sees "Sign in again", and logging in returns to /staff | `e2e/dash-1.spec.ts` |
| `next` never leads to another website | `nextPath.test.ts`, `e2e/dash-1.spec.ts` |
| Tile parsing | `staffDashboard.test.ts` |
| axe and no sideways scroll at 390, 768 and 1440 px, light and night, ro and en | `e2e/dash-1.spec.ts` (24 views), `staff-shell.spec.ts` |
| Menu order per role (grouped order) | `staff-shell.spec.ts`, `epic-s1-e11.spec.ts` updated |

Screenshots: `/mnt/project-files/05_product-and-build/builder/screenshots/dash-1/` (front page at 1440, 768 and 390 px, the phone menu open, session ended).

## Definition of Done
- [x] CI green  - [x] RLS allowed and denied tests (no new table; function refusals tested)  - [x] ro and en strings
- [x] axe clean, keyboard checked  - [x] No personal data in logs or analytics
- [ ] Reportable and blockable (not user content)  - [x] Docs updated
- [ ] Tested on staging by a person

## Checks
RESULTS_PLACEHOLDER

## Follow-ups
- The footer still lists every area link; it could become just the logged-actions line now that the side menu exists.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
