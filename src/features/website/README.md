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
  `SafetySection`, `QuestionList`), `NoticeStrip.tsx`, `HelpCentrePage.tsx`, `HelpPageView.tsx` and
  `CmsMarkdown.tsx`, which shows the safe Markdown subset.
- Staff pages: `components/staff/WebsiteAdminPage.tsx` with the three editors (`HomePageEditor`,
  `NoticeEditor`, `HelpEditor`) and the parts they share (`CountedField`, `MarkdownField`,
  `PublishControls`, `VersionHistory`, `EditorFeedback`).
- `lib/`: small pure helpers, each with a test where it holds logic (`versionState.ts` sorts an
  entry's versions into draft, live, scheduled and earlier).

The staff texts are the `websiteAdmin` namespace, registered when the page opens
(`registerWebsiteAdminTranslations.ts`).
