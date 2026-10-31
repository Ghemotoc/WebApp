# Onboarding

"Set up your profile", screen 2.5 (story S1-E2-06; design/boards/Onboarding.dc.html). It shows once, to a new account past the age check, and every step except the username can be skipped and changed later in Settings.

- `api/onboarding.ts`: reads `my_onboarding()`, the `regions` table and `onboarding_topics(language)`, and writes through `save_my_region()`, `save_my_preferences()`, `set_adults_may_message()` and `finish_onboarding()`.
- `hooks/useMyOnboarding.ts`: the person's setup and its writes; `hooks/useOnboardingChoices.ts`: the counties, categories and topics to pick from.
- `components/OnboardingPage.tsx` (`/setup`): the card, then `OnboardingSteps` while setup is due, the username form alone for an older account without a username, or the home page when there is nothing to do.
- `components/OnboardingSteps.tsx`: one step at a time with `StepHeader`; focus moves to each new step's heading.
  - `NameStep`: the username (only when missing, through the account feature's `SetupForm`), the interface language and the optional county (`RegionSelect`).
  - `LikesStep`: what they like to read and write and topics (`LikesFields`), which fill Discover's "Picked for you".
  - `SafetyStep`: under-18s only: block, report, who can message them (`AdultMessagesSwitch` for 16 and 17) and the guidelines in short.
  - `TeacherStep` (from the teacher-badge feature, S1-E2-11): adults only, optional: "Are you a teacher?".
- `components/LikesSettingsSection.tsx`: Settings › What you like, the same choices later.

The notice that links here ("Finish setting up your profile") is the account feature's `SetupProfileNotice`. The database side is the `…_s1_e2_06_onboarding.sql` migration; the Teacher badge step for adults is the teacher-badge feature's (S1-E2-11).
