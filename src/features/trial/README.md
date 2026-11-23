# Trial

The invited-adults trial's three switches (TRIAL-1: TRIAL-FEEDBACK and TRIAL-DESKTOP; Robert, 21 Nov 2026; boards J30 to J33). Both flags are off until staff switch them on in Staff › Settings.

- `components/TrialFeedback.tsx` and `MemberTrialFeedback.tsx`: in AppLayout. For a signed-in member, while `trial_feedback` is on, they load the tab.
- `components/BugReportTab.tsx`: "Report a bug" on the right edge; opens the panel, fetched on the first press.
- `components/BugReportPanel.tsx` and `BugReportForm.tsx`: the shared Sheet with the three kinds, "What happened?", the line on what else is sent, Send and Cancel; then the thank-you line.
- `hooks/useBugReport.ts`: sends through the Contact us pipeline (`/api/contact`, topic `bug_report`), so a report is a support ticket under Bug and an email to the support inbox.
- `lib/pageContext.ts`: the page's path (never its query or hash), the browser as a name and version, the window and screen sizes.
- `components/DesktopOnlyGate.tsx`, `TouchDeviceGate.tsx` and `ComputerOnlyPage.tsx`: around AppLayout. On a phone or touch-only tablet, while `desktop_only` is on, "For now, the test runs on a computer" with Copy link replaces the page.
- `lib/touchFirstDevice.ts` and `hooks/useIsTouchFirstDevice.ts`: a phone or tablet is told by its pointer, never by the window's width.
- `lib/openOnPhones.ts`: the pages a phone can still open (the DSA contact points and the email links).
- `components/SignedOutGate.tsx` and `lib/openSignedOut.ts` (TRIAL-WALL; Robert, 23 Nov 2026): inside AppLayout. While `members_only` is on, a signed-out visitor sees only the home page with Get in, Read (Discover, a story's page and the chapter preview), signing in and up and the legal, contact and report pages; any other address sends them to the home page. The preview itself is cut on the server: `teaser_of()` keeps 150 words (`teaser_length`) and never more than half a chapter, then "Log in to read on".
