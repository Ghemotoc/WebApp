<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #120
Part of #173

Bundle 14 SPONSORS, part f: why a story is 16+ or 18+, and the network ads that keeps off its pages (S1-E3-06 and S1-E12-04; your decision of 2 Nov 2026). This branch sits on top of #324 (and so on #323 to #318). It targets #324's branch until those merge, and then main.

## What changed

- **The writer says why.** Picking 16+ or 18+ on the new story form or in story settings shows "Why is it 16+?" with seven tick boxes: sexual content, nudity, graphic violence or gore, strong language, drugs, self-harm and dark themes. At least one is needed to save.
  - Picking 18+ with nothing ticked starts on "Sexual content", as the plan says.
  - Moving a story down to 13+ or All ages clears the reasons.
- **Network ads stay off** every page of a story with sexual content, nudity or graphic violence ticked. Our own ads fill the slot instead. Strong language, drugs, self-harm or dark themes alone leave the network on, and sponsors are not affected.
- **Moderators** see and change the reasons in Staff › Stories › a story, like any other setting. The change is versioned and logged, and the network goes off at once.
- **Database** (`…_sponsors_f_rating_reasons.sql`):
  - a new list `story_rating_reason` and the column `stories.rating_reasons`;
  - a trigger keeps the reasons in step with the rating: none below 16+, and an 18+ story with none gets "sexual content", so the network also goes off at once when staff raise a story to 18+ (for example after a picture check);
  - the 18+ stories saved before this start on "sexual content";
  - `create_story()`, `update_my_story()`, `check_story_labels()` and the staff story settings functions take the reasons; an unknown reason is refused;
  - `network_ads_barred()` and `fill_ad_slot()` skip the network step on such a story.
- Words are in both languages, and the Romanian is gender-neutral.
- **Records:** the code tour and a decisions row.

## How it was tested

- The new database test `276-rating-reasons` (10 tests):
  - the writer saves 16+ with strong language and drugs; repeats are kept once;
  - strong language alone leaves the network on;
  - an unknown reason is refused;
  - sexual content ticked: the story's page shows our own ad, while Discover still shows the network;
  - moving down to 13+ keeps no reasons;
  - a moderator adds graphic violence, the change is versioned as `rating_reasons`, and the network goes off at once;
  - an 18+ story with no reason given starts on sexual content.
- Unit tests: the form asks for a reason on 16+ and 18+ and none below; staff changes send the reasons only when they really changed.
- e2e `ratings.spec.ts` now ticks a reason before the 16+ story saves and checks it is stored.

## Local check run

LOCALRUN

## By hand

Nothing.

## Questions for Robert

None blocking. The list of seven reasons and the "Sexual content" default for 18+ are my proposal from the plan; you can change them.

## Follow-ups

- Readers don't see the reasons yet. They could sit next to the rating on the story page, if you want that.
- A 16+ story saved before this has no reasons. Its writer is asked to tick one the next time they change its settings.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
