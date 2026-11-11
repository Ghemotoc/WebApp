# Analytics events

Every analytics event the app sends, named `object_action` (CLAUDE.md conventions). Events carry no personal data: no user ID, email, IP address, handle or user text (CLAUDE.md rules 7 and 12; Definition of Done, Analytics).

Created by S1-E1-04. The events are sent by `src/lib/analytics/track.ts` (S1-E15-01; ADR 0007): no script, no cookie, no page views, every event reported against the site's root, nothing while the browser asks not to be tracked. **Analytics is off until the provider is chosen (Q49, OPEN) and its build variables are set at GO-LIVE**, so no event leaves the browser today. The March numbers come from our own database (S1-E15-02).

The rule (S1-E15-03): every event the code sends is a row here and a line in `src/lib/analytics/catalogue.ts`; `src/lib/analytics/catalogue.test.ts` fails the build when the two lists differ or a `trackEvent()` call names an event that isn't here. Properties are small fixed sets, never personal data.

| Event | Fires when | Properties | Where | Story |
| --- | --- | --- | --- | --- |
| `language_changed` | someone picks another interface language | `language`: `en`, `ro`, `sv`, `da` or `nb` (an open interface language; MARKETS-2a) | `src/features/language/hooks/useInterfaceLanguage.ts` | S1-E1-04 |
| `sign_up_completed` | an account is created through the sign-up form | none | `src/features/auth/hooks/useSignUpForm.ts` | S1-E2-01 |
| `story_created` | a writer creates a story | `category`: the category's slug | `src/features/writing/hooks/useNewStoryForm.ts` | S1-E3-01 |
| `chapter_published` | a writer publishes a chapter now | none | `src/features/writing/hooks/useChapterPublishing.ts` | S1-E3-03 |
| `chapter_scheduled` | a writer schedules a chapter | none | `src/features/writing/hooks/useChapterPublishing.ts` | S1-E3-03 |
| `report_submitted` | a signed-in person sends a report | `reason`, `item_type` (never the item or the reporter) | `src/features/reporting/hooks/useReportItem.ts` | S1-E10-01 |
| `writer_followed` | a reader follows a writer | none (never who) | `src/features/people/hooks/useFollow.ts` | S1-E6-05 |
| `story_followed` | a reader follows a story | none (never which) | `src/features/people/hooks/useFollow.ts` | S1-E6-05 |
| `chapter_shared` | a reader copies a chapter's link, shares it with the device's share sheet or presses "Send in Messages" (GAPS-7a) | `method`: `copy_link`, `share_sheet` or `message` | `src/features/sharing/lib/countShare.ts` | S1-E4-05 |
| `quote_card_saved` | a reader saves a quote card picture | none | `src/features/sharing/hooks/useQuoteCardActions.ts` | S1-E4-07 |
| `picture_card_saved` | a reader saves a picture card | none | `src/features/sharing/hooks/usePictureCardActions.ts` | S1-E4-11 |

Candidates not built: `sign_up_refused` with the reason only, `story_completed`, `story_deleted`, `story_rating_raised`, `profile_viewed` and `account_blocked`. The March numbers for sign-ups, reports and follows come from the database instead (S1-E15-02).
