# Known board mismatches

The boards in design/boards are the source of truth for layout, but where a board disagrees with docs/decisions.md or the story, **the decision and the story win**. Build the corrected version and mention the mismatch in the pull request.

## Still open

| Board | Element | Change |
| --- | --- | --- |
| Website-Home | The FAQ answers and the prize line say under-16s need a parent's consent and everyone does a Yoti age check | Right for the public launch. For the March test (invited adults only, decided 17 Oct 2026, 12:44) the public home page (S1-E5-08) says the test is for invited adults; the consent and age check copy goes live with S1-E2-03 and S1-E2-08, before minors join (architecture 1.7.9) |
| Teaser | Six widget doodles | Confirm the teaser is not a "sharing" screen under the no-doodle rule; remove them if it is (OPEN for Robert) |

## Fixed on the boards (17 Oct 2026)

The end-to-end check found these; the boards were corrected the same day, so build what the board now shows.

| Board | What the board now shows |
| --- | --- |
| Onboarding, Settings, AdminSettings, Website-Home | Romanian by default for everyone; Romania opens first, English-speaking countries follow one by one after their legal check (decided 17 Oct 2026, 11:48) |
| ModCase | A "Safety contacts for Romania" panel built from `content/safety-contacts.json` (S1-E10-13) |
| Settings | Account › Signed-in devices (device, last active, Sign out, "Sign out of all other devices", no IP or location; S1-E2-05). Download my data: one ZIP with a JSON data file plus every story as a Word file (decided 17 Oct 2026, 12:34) |
| AdminUsers (8.5) | Manual age checks panel showing the year of birth with the age group (S1-E2-08b; decided 17 Oct 2026, 12:34) and a Users › Invites tab (S1-E11-17, decided 17 Oct 2026, 13:01) |
| AdminMetrics | Return rate from daily totals only; aggregated metrics kept 3 years; class certificates with a real name deleted 30 days after the class is archived |
| AdminPages, Contest, AdminContests, AdminSponsors, Forums, ClassSpace, AdminSchools, Discover, AdFormats, Website-Home | The First Chapter contest is gone (decided 17 Oct 2026, 12:34): placeholders "[Contest name]" and the age groups 13 to 15, 16 to 17 and 18 and over. AdminPages' notice strip shows on the website and the app (decided 17 Oct 2026, 12:44) |
| Certificate-Participation, Certificate-Winner, AdminSchools | Online contest certificates print the pen name; class certificates may print the real name with the school and are deleted 30 days after the class is archived (decided 17 Oct 2026, 12:44) |
| AdminClassics (8.16) | Only staff with the admin role manage Classics (decided 17 Oct 2026, 12:44) |
| AdFormats | Two ads can be in view on wide screens, never the same ad twice (decided 17 Oct 2026, 12:44) |
| Doodle CSS on every board | Only `tmc-dd-wide` (hides under 1000 px) and `tmc-dd-hide` (hides under 600 px), as in the DoD; doodles that overlapped text or links were moved or removed (Search, Legal, AppOnly, Thread, Discover) |
