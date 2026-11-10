<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

The two failures from the accessibility check of 6 Nov 2026 (light and night themes, every route), sent on ahead of the LOOK bundles because they affect every signed-in page. Robert gave the go for the design catch-up at 06:43 UTC.

## What changed

- **Count badges in night mode.** The gold badges (the notification bell, the notification filter counts, the message counts in the chat list and top bar, the current sign-up step) used `text-ink`, which turns light in night mode: light on gold read 1.5:1 (WCAG 1.4.3).
  - New token `--on-gold: #26142e` in both themes, because the gold itself doesn't change. About 9:1 on #e6c24c.
  - The five components use `text-on-gold`.
- **Library on a phone.** The two Following cards were grid items with an automatic minimum width, so a followed writer or story pushed the page past a 390 px screen (WCAG 1.4.10, CLAUDE.md rule 21). The grid now has one column below `lg` and the card has `min-w-0`.

## Tests

- `e2e/library.spec.ts`: with a writer and a story followed, the Library at 390 px doesn't scroll sideways. Without the fix it fails (433 px wide).
- `e2e/notifications.spec.ts`: in night mode the bell's count is #26142e on #e6c24c. Without the fix it fails (light text). axe never caught this, because the badge is `aria-hidden` (the link's name already says the count).

## Local check run

- `npm run lint`, `npm run typecheck`, Prettier: clean.
- `npm test` (Node 24): 244 files, 1,521 tests passed.
- e2e: library, notifications, messages, messages-block-and-report and sign-up: 92 passed.
- No migration.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
