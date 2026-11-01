# FORUMS-1f plan: forum search (S1-E8-10, #76)

- **Migration** `20261130100001_forums1_f_forum_search.sql`:
  - `forum_post_search_text()` and `forum_search_snippet()`;
  - `search_forum_posts(term, forum_slug, author_handle, skip, language_code)`, which reuses `search_fold`, `search_query`, `search_like_pattern`, `forum_post_state_for_caller` and `forum_thread_is_shown`;
  - the constraint `forums_slug_not_search`.
- **Database test 226** covers criteria 1 and 2.
- **Screens:**
  - ForumSearchForm on ForumsPage;
  - ForumSearchPage at /forums/search with the forum and author filters;
  - ForumSearchResultRow.
- **e2e:** `forum-search.spec.ts`. This part merges after the bundle's full e2e run.
- **Docs:** code-tour, README and board-fixes.
