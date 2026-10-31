# atlas

Story Atlas, the private planning side of every story (epic S1-E17, `docs/stories/s1-e17-story-atlas.md`; bundle ATLAS). It complements the writer section in `src/features/writing/`: the same stories, the same chapters, with the plan beside them. Started by ATLAS-a (S1-E17-01 to S1-E17-06).

- `components/AtlasHomePage.tsx`: `/plan`; opens the story planned last on this device, or the newest, or "Plan your first story".
- `components/StoryAtlasPage.tsx`: `/plan/s/:storySlug`; `AtlasTopBar` (`StorySwitcher`, Write, New story) and `AtAGlance`: `StorySummary`, `WordsProgress`, `ChaptersAtAGlance`, `StoryDetailsSection`, `LinkedProjectSection` and the writer section's `DeleteStoryControl`.
- Fields that save by themselves: `PlanTextField`, `PlanSelectField`, `WordTargetField`, with `SaveNote`; the logic is `hooks/useAutosaveField.ts`.
- `hooks/useStoryPlan.ts` and `api/storyPlans.ts`: `story_plan()`, `update_story_plan()` and, for the title, genre and audience, `update_my_story()`.
- `lib/`: `lastPlannedStory.ts` (the device's last story), `planProgress.ts` (the words bar), `wordTarget.ts` (reading a typed target), `linkedProject.ts` (http and https only).
- `registerAtlasTranslations.ts`: the `atlas` text, added when Story Atlas first renders.
- The database side: `supabase/README.md`, "Stories", "Story Atlas plans".
