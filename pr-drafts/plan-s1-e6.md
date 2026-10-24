# Epic S1-E6 plan (Lane A): comments, reactions, likes, downvotes, follows

Plan only; no code until approved. Built on: CLAUDE.md, the architecture and DoD, `docs/stories/s1-e06-comments-reactions-and-follows.md`, the per-story prompts in `prompts/ALL-PROMPTS.md`, the Reader board (3.5), and Lane C's PRs Ghemotoc/WebApp#171 (report button) and Ghemotoc/WebApp#174 (moderation queue).

## Executive summary
- **Order:** 03 likes → 01 comments → 02 reactions → 04 downvotes → 05 follows → QA. This is the CTO's order; I see no better one.
- **Branches:** 03 is cut from `claude/s1-e4-qa` (Lane A only). 01 onwards needs Lane C's report button and queue on the same branch, and that is blocked today by duplicate migration versions (below).
- **Readers never touch the tables (ADR 0004).** Every read and write is a function that applies ratings, blocks and moderation in one place, as `get_chapter()` does.
- **Seven questions** for Robert or the CTO; the first two block 03 and 04.

## 0. Cross-lane conflicts to settle first
1. **Duplicate migration versions on Lane C's chain.** Lane C's tip (`claude/funny-einstein-pkv35k-s1-e11-qa`) still uses `20261023100001`, `…110001`, `…120001`, `…130001` and `…140001`, which Lane A's migrations already use on main (#167 was renumbered to `20261023100101` when it merged; the rest weren't). A branch that merges Lane A and Lane C today fails `supabase db reset`.
   - **Proposal:** Lane C renumbers its chain when it rebases onto main after Lane A's chain merges.
   - Until then I build 03 (no Lane C need). For 01 and 04 I cut from a local merge of `claude/s1-e4-qa` and Lane C's tip with their migrations renumbered in my branch only. That would be a big diff and their files.
   - **Better:** wait for Lane C's renumbered branch and cut from it. Please choose.
2. **Lane C's test `042` will fail after the two chains meet.** It requires a branch in `reportable_item_owner()` and `reportable_item_summary()` for every `reportable_type` value. Lane A added `story` (S1-E3-01) and `chapter` (S1-E3-02a), but the two functions exist only on Lane C's branch.
   - **Proposal:** Lane C adds the `story` and `chapter` branches in the rebase that meets main. They are two lines each: `stories.user_id` / `chapters.user_id`, and the title.
   - Alternatively, I add them in the first S1-E6 PR. That leaves main red between Lane C's merge and mine.
3. **Downvotes open cases in Lane C's table.** S1-E6-04 has to open a lowest-tier case without a report. `cases.source` is Lane C's enum (`report`, `authority_order`, `picture_check`), and "touch nothing in reports/cases" was the original rule.
   - **Proposal:** Lane C adds the source value `downvotes` and a function `open_signal_case(item_type, item_id, source)` that opens or joins the item's case at `seven_days`. 04 calls it.
   - If you'd rather I add it, it would be one labelled block in my migration.

## 1. Per story

### S1-E6-03 Like a chapter (S, first)
- **Branch:** `claude/s1-e6-03-likes`, cut from `claude/s1-e4-qa`.
- **Migration** `2026102511xxxx_s1_e6_03_likes.sql` (versions re-checked against main and every branch first):
  - table `chapter_likes`:
    - columns `id`, `user_id` (not null, references `profiles`), `chapter_id`, `created_at`;
    - unique `(user_id, chapter_id)`;
    - kind: user_action;
    - one policy, `chapter_likes_select_own` (people see their own likes), with explicit grants.
  - `like_chapter(story_slug, chapter_code, should_like boolean)` returns `{liked, like_count}`.
    - It checks that the caller may read the chapter (`reader_visible_story()` + `chapter_is_readable()`).
    - Writes go through `is_active_member()`, unless Q1 says otherwise.
    - The writer may like their own chapter; for ranking, S1-E5-03 can drop self-likes.
  - `get_chapter()` gains `like_count` and `liked_by_me`.
  - **For S1-E5-03 (Lane E):** the view `chapter_like_totals (chapter_id, story_id, like_count, likes_last_7_days)`. It is staff and job only (security definer readers), and its comment says "the popularity job reads this".
- **Screen:** the board's like control at the chapter's end. It is a toggle button with `aria-pressed`, the count in words ("Like, 12 likes") and an SVG heart icon, with no doodles. It also adds the like count on the story page if Story.dc.html has it.
- **Tests:**
  - `150-chapter-likes.test.sql`: allowed and denied for the policy; toggle; one per person; a visitor refused; a reader too young refused.
  - e2e `chapter-like.spec.ts`: toggle, count, axe at 390/768/1440, a visitor sees the count and a "Log in to like" link.
- **Criteria:**
  - "toggles and the count updates" → pgTAP + e2e.
  - "likes feed the popularity score" → the view and its contract test; the job is S1-E5-03.

### S1-E6-01 Comment on a chapter (M)
- **Branch:** `claude/s1-e6-01-comments`, cut from 03 plus Lane C's chain (per 0.1).
- **Migration:**
  - `alter type reportable_type add value 'comment'`.
  - table `comments`:
    - columns: `user_id` (not null), `chapter_id`, `parent_comment_id` (null, or a top-level comment's ID: one level deep, enforced by a trigger), `body` (Markdown subset, at most 2,000 characters), `is_spoiler`, `deleted_at`, `deleted_by` ('author' | 'writer' | 'moderator'), timestamps;
    - kind: user_content; reportable: comment;
    - owner-only select policy plus grants.
  - **Settings, from the 23 Oct decision:** `comment_limit_first_day_per_hour` = 5, `comment_limit_per_hour` = 60, `comment_new_account_hours` = 24.
  - **Functions:**
    - `post_comment(story_slug, chapter_code, body, is_spoiler, parent_comment_id)`. It applies `is_active_member()` and the story's comments switch (Q11, which the switch's stub has waited for). It returns the wait in minutes when the limit is hit. The text is checked by the same `check_chapter_text()`-style sanitiser on save.
    - `get_chapter_comments(story_slug, chapter_code, before)`: newest first, a page of 20 with "Show more". It applies rating, blocks (`is_blocked_with()`), `is_moderated_away('comment', id)` and deleted. It returns handle and pen name, never the user ID, plus a "Writer" flag and `can_delete`.
    - `delete_comment(comment_id)` for the author, or the story's writer for any comment on their story.
  - **Lane C's two functions** get `when 'comment'` branches (labelled block), unless 0.2 assigns them to Lane C.
- **Screen 3.5:**
  - The comments area under the copy notice: "86 comments", "Newest first", the composer with "Hide as a spoiler", the "{{n}} / 2,000" counter (announced politely) and "Be kind. Every report is read by a person."
  - Each comment shows the handle, the "Writer" pill, a relative date and the text through `ChapterText`'s safe renderer (links `nofollow ugc noopener`). Spoilers are hidden behind "Show spoiler", a real button with `aria-expanded`.
  - Actions: Reply (one level), Delete, and Report via Lane C's `<ReportButton itemType="comment">`.
  - The board's "On paragraph 4" marker is S1-E6-06 (after March, not built).
- **Tests:**
  - `151-comments.test.sql`: the policy's allowed and denied tests; reply depth; the 2,000 limit; spoiler; the writer deletes on their own story only; read-only personas refused; the limit at 5/60 (lowered in the test); comments switch off hides and refuses; 16+ chapter comments hidden from kid_14_ok; deleted and moderated comments hidden.
  - e2e `comments.spec.ts` with adult_writer, teen_17, kid_14_ok and kid_14_waiting (blocker/blocked once blocks exist, see 05).
- **Analytics:** `comment_posted` (no text, no IDs); listed in `docs/analytics-events.md` as a candidate, not sent (no analytics yet).
- **Notifications:** the function queues a `comment_posted` job (chapter and comment IDs), like `chapter_published`, for S1-E7-01.

### S1-E6-02 Emoji reactions (S)
- **Migration:**
  - enum `reaction_kind` (heart, fire, laugh, wow, sad, star; decided 17 Oct 2026, 12:44);
  - table `comment_reactions` (`user_id` not null, `comment_id`, `kind`, unique `(user_id, comment_id)`);
  - an owner-only select policy;
  - `react_to_comment(comment_id, kind | null)`: the same kind again, or null, removes it;
  - counts per kind and `my_reaction` in `get_chapter_comments()`.
- **Not reportable:** a reaction carries no text or picture. Abuse through reactions is handled by reporting the comment or the account. I'll say so in the PR.
- **Screen:** the six SVG icons in a picker (a radio group, arrow keys, 24 px minimum targets), with each count named "Heart, 4"; no emoji in the interface.
- **Tests:** `152-reactions.test.sql`; e2e `reactions.spec.ts` with a screen-reader name check (`toMatchAriaSnapshot`).

### S1-E6-04 Private downvote (S)
- **Migration:**
  - table `downvotes` (`user_id` not null, `item_type` reportable_type, `item_id`, unique per user per item);
  - kind: user_action;
  - **one policy, `downvotes_select_staff`** (moderators and admins), so nobody else reads a row, the author included;
  - setting `downvote_case_threshold` (value: Q2);
  - `downvote(item_type, item_id)`:
    - `is_active_member()`;
    - an account under 24 hours old is stored but not counted (the proposal; Q3);
    - nothing is returned except "sent";
    - at the threshold of distinct counted accounts, it calls Lane C's case function at `seven_days` (0.3).
  - In March this covers comments only; forum posts get it with S1-E8-02.
- **Screen:** "Downvote" on others' comments. Afterwards, the board's line "Downvote sent. It's private: nobody sees a count, not even the writer. Only moderators look at it." in a polite live region.
- **Tests:**
  - `153-downvotes.test.sql`: the policy's allowed and denied tests (a moderator reads, the author and a reader don't); the threshold opens one case at the lowest tier; a young account isn't counted; the same account twice counts once.
  - A test that `chapter_like_totals` and every ranking input never read `downvotes`: a grep of the view definitions, plus a pgTAP check on `pg_depend`.

### S1-E6-05 Follow a writer or a story (S, last)
- **Two tables, matching architecture 1.6's `follows_users`:**
  - `follows_users (user_id, followed_user_id)`;
  - `follows_stories (user_id, story_id)`;
  - each with unique pairs, an owner-only select, kind: user_action.
- **Functions:**
  - `follow_writer(handle, should_follow)` and `follow_story(story_slug, should_follow)`. They take a handle or slug, never a user ID. They fail silently (return `{following: false}`, no error) when either side blocks the other.
  - `my_followers()` gives the writer their list (handle, pen name, avatar later). Nobody else can read the list (Q50).
  - Public counts in `get_story_page()` (story followers) and a `writer_follower_count(handle)` for Lane E's profile page.
- **Screens:**
  - Follow on the story page (Story.dc.html, Lane A).
  - A shared `<FollowButton target>` that Lane E puts on the profile page (Lane E owns profiles; I won't build the profile screen).
  - The writer's own "Followers" list on Your writing (a small panel) unless Lane E's profile story takes it.
- **Blocks (S1-E5-05, Lane E, from Thu 29 Oct):**
  - Until it lands, `is_blocked_with()` stays the guarded stub, so following works and the "fails silently" path can't be tested yet.
  - **Proposal:** build 05 on Lane E's E5-05 branch once it is pushed, so the blocker/blocked tests are real. If E5-05 isn't ready by the time 04 is done, build 05 against the stub, mark the blocked tests as `todo` in pgTAP (counted, not skipped silently) and finish them in S1-E6-QA.
- **Tests:** `154-follows.test.sql` and e2e `follows.spec.ts`.

### S1-E6-QA (S)
- **Journeys:** a reader comments, replies, reacts, likes, downvotes and follows the writer and the story; read-only kid_14_waiting can read comments but not write; kid_14_ok doesn't see a 16+ chapter's comments; blocker and blocked can do none of it to each other.
- **Tests:** `095-epic-s1-e6.test.sql` (number checked against Lane C's 092/093 and my 094) and `e2e/epic-s1-e6.spec.ts`.
- **Docs:** `docs/epic-reports/S1-E6.md` and the code tour's "at a glance".

## 2. Questions (OPEN or unclear; I won't choose)
1. **Likes from read-only accounts** (kid_14_waiting, pending_check): should they be able to like? The account gate (`is_active_member()`) would stop them, as for every other write. My recommendation: no, the same rule as comments.
2. **The downvote threshold:** how many distinct accounts open a case? The story says "configured" with no number. A setting either way. A starting proposal would be 5.
3. **New accounts' downvotes:** confirm that accounts under 24 hours old aren't counted (the story's proposal).
4. **0.1:** wait for Lane C's renumbered chain, or build on a locally renumbered merge?
5. **0.2:** who adds the `story` and `chapter` branches to Lane C's report functions?
6. **0.3:** who adds the downvote case source and function in Lane C's `cases`?
7. **Comment notifications:** may 01 queue a `comment_posted` job for S1-E7-01, as `chapter_published` does?

## 3. Risks
- 01, 02 and 04 can't be checked end to end until Lane C's chain and Lane A's share a branch; I'll keep each story's own tests independent where I can.
- The reader's script budget (40 KB) has to absorb the comments area. I'll load the comments as their own chunk when the reader scrolls near them, so the 2-second budget stays.
- Comments are the epic's only user text, so their sanitiser and their report button are the parts I'd most like you to hand-test.
