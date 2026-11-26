/**
 * LibraryPage: the reader's library, screen 3.7 (story S1-E4-03; board
 * design/boards/simplified/New-Library.dc.html since bundle CALM-7c, the shelf page template).
 *
 * Who shows it: the router, at /library; the top bar's "Library" link leads here.
 * What it shows, top to bottom as on the full canvas (board C01-Library; Robert, 25 Nov 2026,
 * 09:50 UTC: no widget missing between the canvas and the live site):
 *   1. "Library", the line about the place being kept on every device, and the meta line saying
 *      who can see the library, with Change (S1-E4-03, third criterion; S1-E13-01).
 *   2. ContinueReading, the page's one hero.
 *   3. LibraryShelves (Reading, Saved, Finished), then the first wide ad slot (S1-E12-01).
 *   4. ReadingListsCard, the bookshelves (GAPS-6, CALM-4).
 *   5. FollowingSection, writers and stories side by side from 900 px, then the second wide ad
 *      slot. The canvas draws a third, a box beside Reading days; a page holds at most two ad
 *      slots (decided 17 Oct 2026, 11:53), so it is left out (docs/board-fixes.md).
 *   6. MyStoriesShelf ("Written by you", NAV-1) as one row of covers, OfflineReadingNote and
 *      ReadingHabitNote (IDEAS-1b), each across the page.
 * A brand-new library (nothing read, saved, on a bookshelf or followed, board C08) shows only
 * Continue reading with "Find a story", the bookshelves and the follows line, so a new member
 * isn't met by a page of empty sections.
 * A signed-out visitor gets a card asking them to log in.
 * What it calls: useLibraryOverview → my_library(); the sections call their own reads.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';
import { useSession } from '@/features/auth/hooks/useSession';
import { LibraryVisibilityLine } from '@/features/privacy/components/LibraryVisibilityLine';

import { useIsNewLibrary } from '../hooks/useIsNewLibrary';
import { useLibraryOverview } from '../hooks/useLibraryOverview';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { ContinueReading } from './ContinueReading';
import { FollowingSection } from './FollowingSection';
import { LibraryShelves } from './LibraryShelves';
import { MyStoriesShelf } from './MyStoriesShelf';
import { OfflineReadingNote } from './OfflineReadingNote';
import { ReadingHabitNote } from './ReadingHabitNote';
import { ReadingListsCard } from './ReadingListsCard';

/** The page's heading block, with who can see the library (S1-E13-01). */
function LibraryHeader() {
  const { t } = useLibraryTranslation();
  return (
    <header className="flex flex-col gap-2">
      <h1 className="m-0 type-display text-ink-heading">{t('title')}</h1>
      <p className="m-0 max-w-[62ch] type-body text-ink-muted">{t('intro')}</p>
      <LibraryVisibilityLine />
    </header>
  );
}

/** For a signed-out visitor: what a library does, and the way in. */
function SignedOutLibrary() {
  const { t } = useLibraryTranslation();
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-8">
      <h2 className="m-0 type-heading text-ink-heading">{t('signedOut.title')}</h2>
      <p className="m-0 type-body text-ink-muted">{t('signedOut.body')}</p>
      <Link
        to="/sign-in"
        className="inline-flex h-11 items-center rounded-full button-main px-4 type-body font-semibold no-underline"
      >
        {t('signedOut.logIn')}
      </Link>
    </div>
  );
}

/** The lower part of the page: what the reader follows, their own writing and the notes. */
function LibraryLowerSections() {
  return (
    <>
      <FollowingSection />
      {/* The page's second ad slot, after the follows (board C01). */}
      <PageAdSlot pageKey="library" position={2} />
      <MyStoriesShelf />
      <OfflineReadingNote />
      <ReadingHabitNote />
    </>
  );
}

/** The signed-in reader's library, once it has loaded. */
function SignedInLibrary() {
  const { t } = useLibraryTranslation();
  const { overview, loadFailed } = useLibraryOverview();
  const isNew = useIsNewLibrary(overview);
  if (loadFailed) return <Notice tone="error">{t('loadFailed')}</Notice>;
  if (overview === null || isNew === null) return null;
  // Board C08: a brand-new library keeps only the three sections that say how to start.
  if (isNew) {
    return (
      <>
        <ContinueReading items={overview.continueReading} />
        <ReadingListsCard />
        <FollowingSection />
      </>
    );
  }
  return (
    <>
      <ContinueReading items={overview.continueReading} />
      <LibraryShelves overview={overview} />
      {/* The page's first ad slot; a library has no single category, so it sends no context. */}
      <PageAdSlot pageKey="library" position={1} />
      <ReadingListsCard />
      <LibraryLowerSections />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the library, or the log-in card
 */
export function LibraryPage() {
  const { t } = useLibraryTranslation();
  const { userId, isKnown } = useSession();
  return (
    <PageContainer className="tmc-rise flex flex-col gap-12 pt-8 pb-16">
      <title>{t('documentTitle')}</title>
      <LibraryHeader />
      {isKnown && (userId === null ? <SignedOutLibrary /> : <SignedInLibrary />)}
    </PageContainer>
  );
}
