# PEOPLE-4 plan (26 Oct 2026)

Robert, 26 Oct 2026, 05:53: "do People-4 and Safe-3 - set up the task list so I see what you are doing please." Branch `claude/people-4-codes-classics-greetings` from main `2c7e67a`.

## Stories

1. **S1-E2-05 follow-up: change the email with two 6-digit codes** (Robert, 25 Oct 2026, 09:15). `verifyOtp({type: 'email_change'})` once per address; the email_change template shows `{{ .Token }}`; the ConfirmEmailPage email_change branch goes. Tests: `emailAddress.test.ts`, template builder test, `e2e/email-change.spec.ts` with Mailpit.
2. **S1-E2-12 optional birthday.** `profiles.birthday_month`, `birthday_day` (owner only, through `profiles_select_own`), `set_my_birthday()`, `admin_set_birthday()` (owner, admin, moderator, with reason, logged), the year of birth locked by a trigger. Settings › Birthday; staff "Correct birthday" on the account page. Privacy notice draft line, retention row, lawyer note. Test `159`, `birthday.test.ts`, `e2e/birthday.spec.ts`.
3. **S1-E2-13 greeting line on Discover.** `greeting_for()` and `my_greeting()` (birthday day, then birthday month, then the joining anniversary from year one). `GreetingLine` with good morning/afternoon/evening by the reader's clock (board 3.1). Tests: `159`, `greeting.test.ts` (two), `e2e/birthday.spec.ts`.
4. **S1-E11-16 part 16a: staff Classics page** (#114). `classic_works`, `classic_free_markets()`, `admin_add_classic_author()`, `admin_save_classic_work()`, `admin_set_classic_chapters()`, `admin_publish_classic()`, `admin_unpublish_classic()`, `admin_list_classics()`, `admin_list_classic_authors()`; `story_classic_author()` gains the source. `/staff/classics` for owner and admin. Test `160`, unit tests for the splitter and the check, `e2e/classics.spec.ts`. 16b (imports, 1 January suggestions, typo versions) stays open.

## Checks
Clean-start quality pass, screenshots of `/settings` (Birthday), `/discover` (greeting), `/staff/classics`, then one ready PR, merge when the local run passes and Cloudflare deploys.
