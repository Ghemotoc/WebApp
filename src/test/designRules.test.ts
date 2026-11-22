/**
 * The design-rules guard (bundle CALM-7a; Robert, 21 Nov 2026: "make the rules the defaults, so a
 * page can't drift from them").
 *
 * It reads every TypeScript and TSX file under src/ and the stylesheets in src/styles/, and fails the build when a page breaks one
 * of the simplified design's rules (handover doc linked in design/README.md; canvas v47):
 *   1. GlassTag is gone: a rank or a reading level is a `Badge` (src/components/ui/Badge.tsx).
 *   2. A page never paints its own colour with a raw value in a class (`bg-[#…]`, `text-[rgb(…)]`):
 *      colours come only from src/styles/tokens.css (CLAUDE.md, Designs). Staff screens, the
 *      certificates (printed on paper) and the provider's own sign-in buttons are left out.
 *   3. Every date and time a member types uses `DateTimeField` (CALM-1c). A time of day on its own
 *      (quiet hours, a reading reminder) and staff screens may keep a plain time or date input; the
 *      class fields that move in CALM-7d are listed until they do.
 *   4. Fact pills become a meta line (CALM-2). InfoPill is not taken away in one go: the files that
 *      still use it are listed, no other file may start using it, and a file that stops using it
 *      must leave the list, so the list only shrinks (CALM-9 sweeps the rest).
 *   5. No 3D bevel or shine on member screens (canvas v47 is flat): the top edge light and the dark
 *      sheen are transparent in every member theme, and no CSS draws an inset bottom bevel. The
 *      staff area keeps its own token set, untouched (Robert, 21 Nov 2026, 06:09 UTC).
 * Who runs it: Vitest (`npm test`), in CI on every pull request. Its sister guard is
 * src/test/noDoodles.test.ts.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/** Every TypeScript and TSX file under src/, as text, loaded by Vite. */
const sourceFiles = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/** The stylesheets, read from disk: Vitest hands CSS files over empty, even with ?raw. */
const stylesFolder = join(process.cwd(), 'src/styles');
const styleSheets: [string, string][] = readdirSync(stylesFolder)
  .filter((name) => name.endsWith('.css'))
  .map((name) => [`/src/styles/${name}`, readFileSync(join(stylesFolder, name), 'utf8')]);

/** The text with its comments taken out, so a comment that names a rule never trips it. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
}

/** True for a test file, which may name the patterns on purpose. */
function isTestFile(path: string): boolean {
  return path.includes('/test/') || /\.test\.tsx?$/.test(path);
}

/** True for a staff screen: staff keep their own look (Robert, 21 Nov 2026, 06:09 UTC). */
function isStaffFile(path: string): boolean {
  return path.includes('/staff/') || path.includes('/features/staff/');
}

/** The TS and TSX files a rule reads, without tests and without comments. */
function codeFiles(): [string, string][] {
  return Object.entries(sourceFiles)
    .filter(([path]) => !isTestFile(path))
    .map(([path, text]) => [path, withoutComments(text)]);
}

/** A colour written straight into a utility class, such as bg-[#fff] or text-[rgb(0 0 0)]. */
const rawColourClass =
  /\b(bg|text|border|ring|fill|stroke|from|to|via|outline|shadow|decoration)-\[(#|rgb|rgba|hsl|color-mix)/;

/** Files allowed to paint their own colours, with why. */
const ownColourExceptions = [
  '/src/features/certificates/', // printed on paper: the certificate keeps its own colours
  '/src/features/auth/components/SocialButtons.tsx', // the provider's own button (DoD, brand kits)
];

/** A plain browser date, time or date-and-time input. */
const plainDateInput = /type(=|: ?)["'](date|datetime-local|time)["']/;

/** Files that may keep a plain date or time input, with why. */
const plainDateInputExceptions = [
  '/src/components/ui/DateTimeField.tsx', // the one field everyone else uses
  '/src/features/reading/components/ReadingComfortFields.tsx', // a time of day on its own
  '/src/features/library/components/ReadingHabitSettings.tsx', // a time of day on its own
  '/src/features/messages/components/MessageEmailSettings.tsx', // a time of day on its own
  '/src/features/moderation/components/AddShiftForm.tsx', // staff: the on-call rota
  '/src/features/interface-text/components/LocaleTextPanel.tsx', // staff: interface text
];

/** An import from the InfoPill module. */
const infoPillImport = /from ['"]@\/components\/ui\/InfoPill['"]/;

/**
 * The files that still import InfoPill (22 Nov 2026). The list only shrinks: CALM-9 turns each
 * one's fact pills into a meta line and takes it out.
 */
const infoPillUsers = new Set([
  '/src/app/shell/StaffBar.tsx',
  '/src/features/account/components/DeviceRow.tsx',
  '/src/features/account/components/LoginMethodRow.tsx',
  '/src/features/atlas/components/BibleEntryView.tsx',
  '/src/features/atlas/components/CastCards.tsx',
  '/src/features/atlas/components/CharacterSheetHeader.tsx',
  '/src/features/atlas/components/CrossLinkChips.tsx',
  '/src/features/atlas/components/IdeaItem.tsx',
  '/src/features/atlas/components/PlanGuardPill.tsx',
  '/src/features/atlas/components/PlanningStatusPill.tsx',
  '/src/features/atlas/components/PublicCharacter.tsx',
  '/src/features/atlas/components/PublicWorld.tsx',
  '/src/features/atlas/components/PublicWorldEntry.tsx',
  '/src/features/atlas/components/StoryPlanCard.tsx',
  '/src/features/atlas/components/StorySummary.tsx',
  '/src/features/atlas/components/TimelineEventItem.tsx',
  '/src/features/atlas/components/TimelineView.tsx',
  '/src/features/atlas/components/WritingStatusPill.tsx',
  '/src/features/certificates/components/ClassCertificatesPage.tsx',
  '/src/features/certificates/components/CompetitionCertificatesForm.tsx',
  '/src/features/certificates/components/MyCertificatesPage.tsx',
  '/src/features/class-points/components/ReportPointsControl.tsx',
  '/src/features/class-points/components/staff/StaffFlagCard.tsx',
  '/src/features/contests/components/staff/ContestEntriesSection.tsx',
  '/src/features/data-requests/components/staff/DataRequestUrgencyPill.tsx',
  '/src/features/data-requests/lib/dataRequestDates.ts',
  '/src/features/design-system/components/PillSection.tsx',
  '/src/features/discovery/api/listPageBackground.ts',
  '/src/features/discovery/components/ListedStoryCard.tsx',
  '/src/features/discovery/hooks/useListPageBackground.ts',
  '/src/features/discovery/lib/categoryAccents.ts',
  '/src/features/errors/components/ErrorPage.tsx',
  '/src/features/forums/components/staff/ForumAdminRow.tsx',
  '/src/features/hub/components/HubCalls.tsx',
  '/src/features/hub/components/HubSpotlight.tsx',
  '/src/features/hub/components/staff/CallItem.tsx',
  '/src/features/hub/components/staff/SessionItem.tsx',
  '/src/features/hub/components/staff/SpotlightItem.tsx',
  '/src/features/landing-pages/components/staff/BlockListRow.tsx',
  '/src/features/legal/components/AfterTheTestLabel.tsx',
  '/src/features/legal/components/LegalDocumentView.tsx',
  '/src/features/legal/components/LegalSectionCard.tsx',
  '/src/features/legal/components/LegalVersionHistory.tsx',
  '/src/features/library/components/ReadingListPage.tsx',
  '/src/features/moderation/components/AccountSanctions.tsx',
  '/src/features/moderation/components/AppealCard.tsx',
  '/src/features/moderation/components/AppealOwnerReview.tsx',
  '/src/features/moderation/components/CaseAccountLinks.tsx',
  '/src/features/moderation/components/CasePage.tsx',
  '/src/features/moderation/components/CaseRow.tsx',
  '/src/features/moderation/components/CaseSignals.tsx',
  '/src/features/moderation/components/TierPill.tsx',
  '/src/features/moderator-mail/components/MailStatusPill.tsx',
  '/src/features/moderator-mail/components/StaffMailInboxPage.tsx',
  '/src/features/notifications/components/NotificationRow.tsx',
  '/src/features/people/components/ProfileStories.tsx',
  '/src/features/privacy/components/AudienceRadios.tsx',
  '/src/features/reading/components/RankingPlacePill.tsx',
  '/src/features/reading/components/StoryLabelPills.tsx',
  '/src/features/reading/components/TeaserStoryCard.tsx',
  '/src/features/safety/components/SafetyChecksPanel.tsx',
  '/src/features/settings/components/AgeRulesSection.tsx',
  '/src/features/spaces/components/ClassAssignmentsCard.tsx',
  '/src/features/spaces/components/SpacePills.tsx',
  '/src/features/sponsors/components/staff/BlockedCategoriesSection.tsx',
  '/src/features/sponsors/components/staff/CampaignList.tsx',
  '/src/features/sponsors/components/staff/placements/PlacementGrid.tsx',
  '/src/features/staff/components/StaffFooter.tsx',
  '/src/features/staff/components/classics/ClassicCard.tsx',
  '/src/features/staff/components/classics/ClassicEditionsTable.tsx',
  '/src/features/staff/components/classics/ClassicSuggestionsPanel.tsx',
  '/src/features/staff/components/classics/FreeMarketsList.tsx',
  '/src/features/staff/components/featured/HomeCommentSection.tsx',
  '/src/features/staff/components/invites/InviteStatusPill.tsx',
  '/src/features/staff/components/metrics/AnalyticsCards.tsx',
  '/src/features/staff/components/metrics/LaunchTaskCard.tsx',
  '/src/features/staff/components/metrics/MarchNumbersPage.tsx',
  '/src/features/staff/components/stories/StaffStoriesPage.tsx',
  '/src/features/staff/components/stories/StaffStoryChapters.tsx',
  '/src/features/staff/components/stories/StaffStoryCover.tsx',
  '/src/features/staff/components/stories/StaffStoryPage.tsx',
  '/src/features/staff/components/stories/StaffStoryResults.tsx',
  '/src/features/staff/hooks/useStaffStoryWords.ts',
  '/src/features/statements/components/MyReportRow.tsx',
  '/src/features/story-languages/components/LanguagesTable.tsx',
  '/src/features/story-languages/components/TranslationChapterList.tsx',
  '/src/features/support/components/FirstReplyPill.tsx',
  '/src/features/support/components/MySupportPage.tsx',
  '/src/features/support/components/MySupportTicketPage.tsx',
  '/src/features/support/components/StaffSupportInboxPage.tsx',
  '/src/features/support/lib/ticketStatusPill.ts',
  '/src/features/tags/components/RankBadges.tsx',
  '/src/features/teacher-badge/components/TeacherBadgePill.tsx',
  '/src/features/waitlist/components/FoundingMemberPill.tsx',
  '/src/features/website/api/staff/listPageBackgrounds.ts',
  '/src/features/website/components/staff/ListBackgroundEditor.tsx',
  '/src/features/website/components/staff/SearchSharingTab.tsx',
  '/src/features/website/hooks/useListPageBackgrounds.ts',
  '/src/features/website/lib/listBackgrounds.ts',
  '/src/features/writing/components/ChapterEditorPage.tsx',
  '/src/features/writing/components/ChapterEmbedNodeView.tsx',
  '/src/features/writing/components/ChapterPictureNodeView.tsx',
  '/src/features/writing/components/DrawnCoverPicker.tsx',
  '/src/features/writing/components/ManagedChapterRow.tsx',
  '/src/features/writing/components/StoryPreviewAside.tsx',
]);

/** Starts with any of the given path prefixes. */
function isListed(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

/**
 * The selector of the block each line of a CSS file sits in, so a rule can tell a staff block
 * from a member one.
 *
 * @param css - the file's text
 * @returns one entry per line: the line and the selector above it
 */
function linesWithSelector(css: string): { line: string; selector: string }[] {
  let selector = '';
  return css.split('\n').map((line) => {
    // Step 1: a line that opens a block (`[data-theme='night'] {`) names the block that follows.
    if (/^\s*[^\s/*].*\{\s*$/.test(line)) selector = line.trim();
    return { line, selector };
  });
}

describe('the design rules are the defaults', () => {
  it('finds the source files', () => {
    expect(Object.keys(sourceFiles).length).toBeGreaterThan(500);
  });

  it('no file uses GlassTag: a rank or a reading level is a Badge', () => {
    const offenders = codeFiles()
      .filter(([, text]) => /\bGlassTag\b/.test(text))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('no member screen paints its own colour with a raw value in a class', () => {
    const offenders = codeFiles()
      .filter(([path]) => !isStaffFile(path) && !isListed(path, ownColourExceptions))
      .filter(([, text]) => rawColourClass.test(text))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('every date and time a member types goes through DateTimeField', () => {
    const offenders = codeFiles()
      .filter(([path]) => !isStaffFile(path) && !isListed(path, plainDateInputExceptions))
      .filter(([, text]) => plainDateInput.test(text))
      .map(([path]) => path);
    expect(offenders).toEqual([]);
  });

  it('no new file starts using InfoPill: fact pills become a meta line', () => {
    const newUsers = codeFiles()
      .filter(([path]) => !path.endsWith('/InfoPill.tsx'))
      .filter(([path, text]) => infoPillImport.test(text) && !infoPillUsers.has(path))
      .map(([path]) => path);
    expect(newUsers).toEqual([]);
  });

  it('a file that stops using InfoPill leaves the list, so the list only shrinks', () => {
    const stale = [...infoPillUsers].filter((path) => {
      const text = sourceFiles[path];
      return text === undefined || !infoPillImport.test(withoutComments(text));
    });
    expect(stale).toEqual([]);
  });

  it('member themes draw no top edge light and no dark sheen (canvas v47 is flat)', () => {
    const tokens = styleSheets.find(([path]) => path.endsWith('/tokens.css'))?.[1] ?? '';
    const offenders = linesWithSelector(tokens)
      .filter(({ selector }) => !selector.includes('staff'))
      .filter(({ line }) => /--(glass-highlight|lg-dark-sheen):/.test(line))
      .filter(({ line }) => !/transparent/.test(line))
      .map(({ line, selector }) => `${selector} ${line.trim()}`);
    expect(tokens.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it('no stylesheet draws a 3D bevel or a white shine', () => {
    const bevel = /inset 0 -\d|inset 0 1px 0 (rgba?\(255|#fff|white)/;
    const offenders = styleSheets.flatMap(([path, text]) =>
      linesWithSelector(text)
        .filter(({ selector }) => !selector.includes('staff'))
        .filter(({ line }) => bevel.test(line))
        .map(({ line }) => `${path}: ${line.trim()}`),
    );
    expect(offenders).toEqual([]);
  });
});
