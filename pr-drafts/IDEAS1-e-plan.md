# IDEAS-1 part e: notifications open the paragraph's thread (idea 2), "Most shared this week" (idea 9)

- Migration 20261123100001: notification_json() + comment_place; list 'shared', sort 'shared', story_shares_this_week(), is_story_list_kind, list_holds_story, list_default_sort, browse_stories, discover_shelves.
- Front: src/lib/paragraph-link.ts; notificationText commentAddress; reader useLinkedParagraphThread; discovery list kind and sort; settings shelf word.
- Tests: pgTAP 219; unit paragraph-link, notificationText, listAddresses; e2e paragraph-links-most-shared; ranking.spec default fixed.
