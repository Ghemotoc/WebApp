<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #79

Bundle 11 CLASSES, part f: the epic check for forums and spaces (S1-E8-QA). It adds no feature: it walks the epic's twelve stories together and comes with the bundle's full end-to-end run. Bundle 11 is done with this pull request.

## What changed
- **`e2e/epic-s1-e8.spec.ts`**, two browser journeys as the March test runs them (`adults_only` on):
  - a thread, a quote, kid_14_ok reading but told their account can't post yet, and teen_17 finding it under "New for you" (S1-E8-02, 03 and 04 with the account gate);
  - a class with a thread: the student replies, kid_14_waiting waits for a parent and sees no thread, adult_writer never finds the class, and the teacher's certificate reaches the student through the notification (S1-E8-11, 02 and 12 with notifications).
- **`supabase/tests/database/237-epic-s1-e8.test.sql`** (30 tests), the same ground as it will run once minors join (`adults_only` off, parental consent on): every seed persona the story names, plus a space with its moderator, signature and rank (S1-E8-05 to 10).
- **`docs/epic-reports/S1-E8.md`**: what works, the policies and their tests, the known gaps and the stubs still on.
- **`docs/code-tour.md`**: "One journey through the whole epic", from the class page to the printed certificate.

## How it was tested
- The new database test and spec, and the bundle's full end-to-end run (below).
- No break was found where the stories meet.

## Local check run
LOCALRUN

## By hand
- Nothing on staging: no SQL top-up and no new secrets.

## Board mismatches
None: no screen changed.

## Questions for Robert
None new. The five certificate questions in #281 still stand.

## Follow-ups
- From the report's known gaps: contest certificates (S1-E12-02), a server-made PDF (S1-E11-09b), a rate limit on the check page (S1-E10-12), live updates in forums, a link to My certificates in the account menu.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
