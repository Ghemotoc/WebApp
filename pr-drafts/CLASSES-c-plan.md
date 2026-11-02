# CLASSES-c plan: stories shared only with a class (S1-E8-11)
- Migration 20261208100001: stories.class_only and class_space_id; story_class_allows() gate in chapter_is_readable, story_has_readable_chapter, reader_visible_story, story_cover_picture; listed_stories and profile_story_cards leave class stories out; notify_chapter_published only tells class members; my_class_choices, story_class_share, set_story_class, class_space_stories.
- pgTAP 234; unit classStories.test.ts; e2e class-stories.spec.ts.
- Screens: StoryClassCard (Story settings), ClassStoriesCard (class page), ClassStoriesPage (See all).
- Ads: deferred to bundle 14 pick_banner().
