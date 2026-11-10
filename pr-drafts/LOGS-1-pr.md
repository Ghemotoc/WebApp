<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle LOGS-1, parts c to e). Robert asked on 6 Nov 2026 for a call log covering every call the app makes and its failures.

## What changed

- **Every call the app makes to the back end is noted.** The log keeps the kind, name, outcome, status, error code, duration, route pattern and app version. `log_calls()` stores it under the caller's own user ID (empty for visitors) and keeps it for 30 days. It never keeps what was sent or what came back, and never an email, an IP address or user text (CLAUDE.md rule 12).
- **Staff › Logs** is for the owner and admins. It has three views: Calls (with filters), Failures (grouped) and the browser crash log. Looking at one person's calls is written to the audit log.
- **`call_log` uses RLS** (`call_log_select_admin`, with allowed and denied pgTAP tests in 307) and has explicit grants. It is in the signed-out reads test (021).
- **Privacy notice** (ro and en) and `docs/retention.md` are updated. The staff menu tests now expect "Logs" after "Metrics".

## How it was tested

- The full check list ran on the stack of the ten queued bundles. The failures it found were fixed and rerun, and everything passes: database tests 021 and 307, `staff-logs.spec.ts`, and the staff menu specs. Lint, types, generated types, schema, unit, database and build checks also pass.

## By hand (staging)

- The privacy notice change needs the usual lawyer read before a new legal version is published.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
