<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of #113

Bundle 13 CONTESTS, part b2b: judging, publishing results and sending prizes (S1-E11-15 criteria 7, 8 and 10). Certificates for participants, finalists and winners follow in part b2c, then the admin epic check and the bundle's full test run.

## What changed

- **Judging.** Once entries close, each valid entry in Staff › Contests gets a Placing choice: Winner, Finalist or None. Only the owner and admins choose; partner judges tell staff their choice, there is no public vote and the sponsor has no say.
- **Publishing results.** A Results panel above the entries publishes them once there is at least one winner. The contest's landing page then ends with a Results section: winners first, then finalists, by pen name only (never age, school or real name), with a link to the story only where that visitor may open it (moderation, blocks and their age are respected).
- **Prizes.** After the results are out, staff mark a winner's prize as sent. For a winner under 16, or whose age isn't known, a box "A parent's or guardian's consent for the delivery details is on file" must be ticked first, and the server refuses without it. Only the date and that confirmation are stored; the address never goes into the app.
- **Records:** a builder proposal row in decisions, the code tour and both features' READMEs. Every choice, the publishing and each prize are in the audit log.

## How it was tested

- Database test 267 (21 tests): nobody is placed while entries are open; a moderator can't choose; only winner, finalist or none; a withdrawn entry can't place; no publishing without a winner; choices are logged; no results on the page before publishing; a moderator can't publish; results publish once and are logged; a signed-out visitor sees the winner first and the finalist, with a story link only for the story they can open, and each result carries only the pen name, placing and story; only a winner gets a prize; a winner under 16 needs the parent's consent confirmed; both prizes recorded with the consent only for the child; a prize is marked once; the staff list shows placings and which prize needs a parent's consent.
- e2e `e2e/contests.spec.ts` (new fourth test): after entries close, the admin picks the winner, publishes, marks the prize as sent (no consent box for an adult), axe on the screen; a signed-out visitor sees Results, Winners and the link to the story on /c/concurs-e2e.

## Local check run

LOCALRUN

## By hand

- Nothing.

## Board mismatches

- None: no board draws judging or published results yet; plain staff components, and the landing page's Results section uses the page's existing styles.

## Questions for Robert

None blocking. The decision row is a proposal (owner and admins choose; pen names only; the parent's consent box before a prize goes to a child). Please read the new Romanian text in `src/locales/ro/contests.json` (staff.results) and `landingPages.json` (results); the placings are worded so they don't depend on gender ("Câștigă", "În finală").

## Follow-ups

- Telling writers in the app when their entry wins or reaches the final isn't in the story; it could reuse the notification system later.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
