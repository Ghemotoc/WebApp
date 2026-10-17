# Known board mismatches

Found by the end-to-end check on 17 Oct 2026. The boards in design/boards are the source of truth for layout, but where a board below disagrees with docs/decisions.md or the story, **the decision and the story win**. Build the corrected version and mention the mismatch in the pull request. Rows marked "Depends on question N" wait for Robert's answer (docs/open-questions.md, "Raised by the end-to-end check").

| Board | Element | Change |
| --- | --- | --- |
| Onboarding | Hint under the interface language: "We picked English because your device is set to English." | Romanian by default for everyone (17 Oct 11:48): "We start in Romanian. Change it here." |
| Settings | Language tab: "When you're logged out, we use your device's language…" | Same decision: "When you're logged out, Ghemotoc opens in Romanian; pick English from the menu." |
| AdminSettings | Markets: "with Romania and every English-speaking country opening together" | Romania first, others one by one after their legal check |
| Website-Home | About line: "for readers in English-speaking countries and Romania" | "Starting in Romania; English-speaking countries follow" |
| ModCase | "Helplines for English-speaking countries: [to be confirmed per country]" | Show the contacts for the person's country from `safety_contacts` (S1-E10-13; research G4 exists) |
| Settings | No "Sessions" section anywhere | Add a signed-in devices list (device name, last seen, no IP) and "Sign out of all" (S1-E2-05, an MVP story) |
| AdminUsers | No manual age check panel | Add the manual check queue and decision with reason (S1-E2-08b; architecture puts it on 8.5) |
| Doodle CSS on boards | `tmc-dd-wide` is 999 px on 11 boards and 1180 px on 10; extra classes `tmc-dd-lg`, `-xl`, `-xxl`, `-w`, `-l`, `-m` | DoD knows only `tmc-dd-wide` (under 1000 px) and `tmc-dd-hide` (under 600 px). Standardise the boards, or add the extra classes to the DoD |
| Teaser | Six widget doodles | Confirm the teaser is not a "sharing" screen under the no-doodle rule; remove them if it is |
| Settings | "Download my data" copy: "as Word (.docx) files in one ZIP" | Depends on question 1 |
| Contest, Website-Home | "Aged 13 to 19", "If you're 13 to 19" | Depends on question 4 |
| AdminPages | Link note: notice strip "at the top of the website and the app" | Depends on question 3 |
