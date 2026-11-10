<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle PROFILE-1). Follow-up to S1-E2-04 (Settings). Robert, 6 Nov 2026, 11:21 UTC: "the profile page, it's very long, you need to scroll a lot, so I will need it to be compartmentalized a bit better" (11:22: he meant Settings › Profile).

## What changed

- **Settings shows one group at a time**, with the board's side menu: Profile, Email and sign-in, Privacy, Notifications, Messages, Download my data, Help and support and Delete account, plus My reports (`SettingsNav`, `SettingsGroupPanel`, `lib/settingsGroups.ts`, `hooks/useSettingsGroup.ts`).
- **The address names the group** (`/settings#privacy`), and every older panel link (`/settings#teacher-badge`, `/settings#ways-to-log-in`, `/settings#download-my-stories` in emails and notices) opens the group that holds it.
- **Tests that opened Settings** now go to the group they need (devices are in Email and sign-in, the Legal centre link in Help and support).

## How it was tested

- The full check list ran on the stack of the ten queued bundles; the Settings tests that failed there were updated and rerun with the other failures (all pass), and lint, types, unit, database and build checks pass.

## By hand (staging)

- Nothing.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
