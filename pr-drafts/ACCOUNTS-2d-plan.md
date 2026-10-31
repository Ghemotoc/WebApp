# ACCOUNTS-2d plan: onboarding (S1-E2-06)

Board: Onboarding 2.5. Board fix (25 Oct): the username is chosen at sign-up, so step 1 asks for it only when an older account has none; the pen name lives in Settings.

## Database (migration `…_s1_e2_06_onboarding.sql`)
- `profiles`: `onboarded_at` (null until "Go to Discover"; every existing profile set to now), `region_code` (optional county, references `regions`), `adults_may_message` (false; only a 16 or 17-year-old may switch it on; S1-E9-03 reads it later).
- `regions`: Romania's 41 counties and Bucharest (ISO 3166-2:RO), reference data, readable by everyone.
- `reading_preferences`: the person's explicit likes: `read` and `write` categories and `topic` tags. Owner reads; written only through `save_my_preferences()`.
- `my_onboarding()`, `onboarding_topics(language)`, `save_my_region()`, `save_my_preferences()`, `set_adults_may_message()`, `finish_onboarding()`.
- Discover: list kind `picked` (stories in a category the reader likes to read or with a topic they picked), its shelf after `following` in `discover_shelves`. Only for someone signed in. Explicit choices, never inferred.

## Screens
- `/setup` becomes the three steps. Step 1: username (only if missing), interface language, optional county. Step 2: likes (chips). Step 3: "Staying safe here" for under-18s (block, report, adult messages switch for 16 and 17, the guidelines in short); adults finish after step 2 until S1-E2-11 (part f). "Go to Discover".
- `SetupProfileNotice` also says "Finish setting up your profile" while onboarding isn't done (not while the age check is pending).
- Settings: "What you like" section with the county and the likes.

## Tests
- pgTAP 202: policies allowed/denied, functions, picked list.
- e2e onboarding.spec: adult through steps 1 and 2 to Discover with the picked shelf; a 16-year-old's step 3 and the switch; Settings change; axe at three widths.
