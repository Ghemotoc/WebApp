# website

The public website pages and the staff CMS that writes them (stories S1-E11-06, S1-E11-10,
S1-E11-12 and S1-E5-08; architecture 1.8.6). Website page text comes only from here, never from
the locale files; the buttons and labels around it are interface text in `common.json` and
`websiteAdmin.json`.

- `api/websiteContentStore.ts`: the `WebsiteContentStore` contract and its March store, the app's
  own database. The schemas are in `src/schemas/websiteContent.ts`.
- `hooks/useWebsiteContent.ts`: what a visitor sees of one kind, parsed and with the last known copy
  as a fallback. `hooks/useWebsiteEditor.ts`: one kind in one market for the editors.
  `hooks/useMarkets.ts`: the markets and their languages.
- Public pages: `components/WebsiteHomePage.tsx` (with `HomeHero`, `WhyWriteSection`,
  `SafetySection`, `QuestionList`, `QuestionsStructuredData`), `NoticeStrip.tsx`,
  `HelpCentrePage.tsx` (with `HelpTopicTiles` and `HelpStillStuck`), `HelpPageView.tsx` and
  `CmsMarkdown.tsx`, which shows the safe Markdown subset. G5b gave them the glass look.
- Staff pages: `components/staff/WebsiteAdminPage.tsx` with the three editors (`HomePageEditor`,
  `NoticeEditor`, `HelpEditor`) and the parts they share (`CountedField`, `MarkdownField`,
  `PublishControls`, `VersionHistory`, `EditorFeedback`).
- `lib/`: small pure helpers, each with a test where it holds logic (`versionState.ts` sorts an
  entry's versions into draft, live, scheduled and earlier).

The staff texts are the `websiteAdmin` namespace, registered when the page opens
(`registerWebsiteAdminTranslations.ts`).
- The home page's lower half (bundle LOOK-3): `components/HomeShelves.tsx` (Trending with genre chips, Completed, New and rising writers), the four bands `WriteBand`, `CommunityBand` (with `hooks/useForumHighlights.ts` and `api/forumHighlights.ts`), `FirstStoryBand` and `AppsBand`, sharing `BandText` and `BandButtons`, and the big footer `HomeFooterColumns`. Their words are the optional parts of the home page in `src/schemas/websiteContent.ts`, edited under "Bands lower down and the footer" in the staff Home page editor.
- The reader comment on the cover wall (bundle GAPS-13; story S1-E5-13): `api/homeComment.ts` (the card, the reader's invitations and the staff picks), `hooks/useHomeComment.ts` and `hooks/useStaffHomeComments.ts`, `components/HomeCommentCard.tsx` (shown by `HeroCollage`) and `components/HomeCommentWords.tsx` (the comment's words, sanitised, never with a link). The invitation is drawn by the hub (`src/features/hub/components/HubHomeCommentInvitations.tsx`) and the staff section by the Featured page (`src/features/staff/components/featured/HomeCommentSection.tsx`).
- Seasonal looks (bundle G12a): `components/staff/SeasonalLooksTab.tsx`, `SeasonalWindowForm.tsx` and `MonthDayField.tsx` (Staff › Website › Seasonal looks), `hooks/useSeasonalLooks.ts`, `api/staff/seasonalLooks.ts` (the `seasonal_look_dates` setting and `admin_set_seasonal_look_dates()`) and `lib/seasonalWindows.ts` (days, months and the overlap check).
