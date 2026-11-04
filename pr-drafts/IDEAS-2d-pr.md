<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14c IDEAS-2, part d: the read-through rate counts the furthest place, and Story settings notice a new Canva cover by themselves (ideas IDEA-20261101-9 and -11, approved on 2 Nov 2026, 22:00). These ideas have no story issue.

## What changed

- **The furthest place (idea 9):**
  - Each reader's place in a chapter now also keeps the furthest point they ever reached. Their latest place is unchanged, so "Continue reading" still takes them back to where they were.
  - The dashboard counts a reader as having finished a chapter once they reached the end, even if they scrolled back up afterwards (criterion 1). "Where readers stop" in the chapter insights counts the furthest place too, so both numbers agree.
  - Below five readers the rate still reads "fewer than 5" (criterion 2).
  - Existing places start with their latest place as the furthest, the best we know.
  - No new kind of personal data: it is the same reading place, in the same row, in Download my data and deleted with it as before.
- **A Canva cover shows up by itself (idea 11):**
  - When the writer comes back to the Story settings tab after making a cover in Canva, the page reads the story again, puts the new cover in the form and says "Your new cover from Canva is here, and it's already saved." (criterion 1).
  - The cover shows with its check state, "Waiting for a check" or "Waiting for a person", as everywhere else (criterion 2).
  - A cover the writer uploaded in the same form doesn't trigger the note.

## Tests

- The new database test `282-furthest-place` (8 tests): the furthest place never goes back while the latest place moves; a reader who reached the end and scrolled back counts as finished; "fewer than 5" below five readers; 3 of 5 gives 60 %; "Where readers stop" agrees; the writer's own place still never counts.
- New unit tests for `useArrivingCover` (3 tests).
- `canva-covers.spec.ts`: after Return in the Canva tab, the settings tab shows the new cover by itself, waiting for its check.

## Local check run

LOCALRUN

## By hand

Nothing.

## Questions for Robert

None. The new Romanian line is draft, as always.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
