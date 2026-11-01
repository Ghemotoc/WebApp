# IDEAS-1 part c: readers to writers (plan)

Ideas IDEA-20261031-3 ("I finished it"), -11 (share a whole story) and -10 (a writer's card colour).

## Database (20261121100001 enums, 20261121100002 main)
- notification_kind 'story_finished' (own file).
- stories.card_colour text, check: one of the nine palette keys or null. update_my_story() takes card_colour (null clears; absent keeps).
- share_options() also returns card_colour.
- finished_thanks (user_id, story_id unique), select own only, written only by send_finished_thanks().
- send_finished_thanks(story_slug): account gate, visible story (blocks), not own, on Finished shelf, once, notify() with story_id; no email (no default delivery for the kind); category falls to 'replies'.
- story_library_state() adds thanks_sent.
- data_export_tables() and account_deletion_rules() with finished_thanks; test 021 line.

## Front end
- Library: FinishedThanksButton + useFinishedThanks; StoryReadingActions shows it on the Finished shelf.
- Notifications: 'story_finished' kind, finishedText(), what.storyFinished, actions.openStory.
- Sharing: StoryShareButton + StoryShareDialog; ShareLinkRow and SharePrivacyNote extracted; lib/systemShare.ts; lib/sharedStory.ts; storyShareLink().
- Cards: backgroundByKey(); quote and picture dialogs start in the writer's colour; picture card gets BackgroundPicker.
- Writing: CardColourField in StoryStatusSection; cardColour in answers, schema and API.

## Tests
- pgTAP 217 (22), 188 and 021 updated.
- Unit: sharedStory.test.ts, shareLink.test.ts.
- e2e/readers-to-writers.spec.ts: thanks once and Sent, writer's notification, not on another shelf or own story, story share on computer and phone, 16+ preview, card colour in settings then the quote card, axe on the story page in 12 views.
