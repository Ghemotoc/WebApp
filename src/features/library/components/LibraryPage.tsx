/**
 * LibraryPage: the reader's library, screen 3.7 (story S1-E4-03; board
 * design/boards/simplified/New-Library.dc.html since bundle CALM-7c, the shelf page template).
 *
 * Who shows it: the router, at /library; the top bar's "Library" link leads here.
 * What it shows, top to bottom as on the board:
 *   1. "Library", the line about the place being kept on every device, and the meta line saying
 *      who can see the library, with Change (S1-E4-03, third criterion; S1-E13-01).
 *   2. ContinueReading, the page's one glass hero.
 *   3. The ad slot (S1-E12-01), then LibraryShelves (Reading, Saved, Finished).
 *   4. ReadingListsCard, the bookshelves (GAPS-6, CALM-4).
 *   5. Two columns from 900 px: FollowingSection on the left; on the right MyStoriesShelf
 *      ("Written by you", NAV-1), OfflineReadingNote and ReadingHabitNote (IDEAS-1b).
 * A signed-out visitor gets a card asking them to log in.
 * What it calls: useLibraryOverview → my_library(); the sections call their own reads.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';
import { useSession } from '@/features/auth/hooks/useSession';
import { LibraryVisibilityLine } from '@/features/privacy/components/LibraryVisibilityLine';

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
      <h1 className="m-0 type-display text-heading">{t('title')}</h1>
      <p className="m-0 max-w-[62ch] type-body text-body">{t('intro')}</p>
      <LibraryVisibilityLine />
    </header>
  );
}

/** For a signed-out visitor: what a library does, and the way in. */
function SignedOutLibrary() {
  const { t } = useLibraryTranslation();
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-10">
      <h2 className="m-0 type-heading text-heading">{t('signedOut.title')}</h2>
      <p className="m-0 text-base text-body">{t('signedOut.body')}</p>
      <Link
        to="/sign-in"
        className="inline-flex h-11 items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
      >
        {t('signedOut.logIn')}
      </Link>
    </div>
  );
}

/** The lower part of the page: what the reader follows, beside their own writing and notes. */
function LibraryColumns() {
  return (
    <div className="grid grid-cols-1 items-start gap-12 min-[900px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] min-[900px]:gap-16">
      <FollowingSection />
      <div className="flex min-w-0 flex-col gap-12">
        <MyStoriesShelf />
        <OfflineReadingNote />
        <ReadingHabitNote />
      </div>
    </div>
  );
}

/** The signed-in reader's library, once it has loaded. */
function SignedInLibrary() {
  const { t } = useLibraryTranslation();
  const { overview, loadFailed } = useLibraryOverview();
  if (loadFailed) return <Notice tone="error">{t('loadFailed')}</Notice>;
  if (overview === null) return null;
  return (
    <>
      <ContinueReading items={overview.continueReading} />
      {/* The page's one ad slot; a library has no single category, so it sends no context. */}
      <PageAdSlot pageKey="library" position={1} />
      <LibraryShelves overview={overview} />
      <ReadingListsCard />
      <LibraryColumns />
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
    <PageContainer className="tmc-rise flex flex-col gap-14 pt-10 pb-16">
      <title>{t('documentTitle')}</title>
      <LibraryHeader />
      {isKnown && (userId === null ? <SignedOutLibrary /> : <SignedInLibrary />)}
    </PageContainer>
  );
}
