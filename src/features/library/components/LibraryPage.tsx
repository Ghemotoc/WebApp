/**
 * LibraryPage: the reader's library, screen 3.7 (story S1-E4-03; design/boards/Library.dc.html).
 *
 * Who shows it: the router, at /library; the top bar's "Library" link leads here.
 * What it shows, top to bottom as on the board: the eyebrow, "Your library", the line about the
 * place being kept on every device and who can see the library, with Change (S1-E4-03, third
 * criterion: private by default; S1-E13-01 adds the choice); ContinueReading; LibraryShelves (Reading, Saved for
 * later, Finished); ReadingHabitNote (the private reading streak, IDEAS-1b); FollowingSection. A signed-out visitor gets a card asking them to log in.
 * Not yet, as noted in docs/board-fixes.md: the ad slot (S1-E12-01), "Your lists" (no story
 * builds reading lists yet) and "Downloaded to read offline" (the apps, S1-E4-08).
 * What it calls: useLibraryOverview → my_library(); the sections call their own reads.
 */
import { Link } from 'react-router';

import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';
import { LibraryVisibilityLine } from '@/features/privacy/components/LibraryVisibilityLine';

import { useLibraryOverview } from '../hooks/useLibraryOverview';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { ContinueReading } from './ContinueReading';
import { FollowingSection } from './FollowingSection';
import { LibraryShelves } from './LibraryShelves';
import { ReadingHabitNote } from './ReadingHabitNote';

/** The page's heading block, with who can see the library (S1-E13-01). */
function LibraryHeader() {
  const { t } = useLibraryTranslation();
  return (
    <header className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex max-w-[640px] flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-none font-extrabold tracking-[-0.025em]">
          {t('title')}
        </h1>
        <p className="m-0 text-base leading-relaxed text-body">{t('intro')}</p>
      </div>
      <LibraryVisibilityLine />
      <Doodle
        name="tote-bag-of-books"
        kind="background"
        hideBelow="wide"
        className="absolute -top-6 right-0 w-[64px] rotate-6"
      />
    </header>
  );
}

/** For a signed-out visitor: what a library does, and the way in. */
function SignedOutLibrary() {
  const { t } = useLibraryTranslation();
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface px-8 py-10">
      <h2 className="m-0 font-heading text-[26px] font-bold text-heading">
        {t('signedOut.title')}
      </h2>
      <p className="m-0 text-base text-body">{t('signedOut.body')}</p>
      <Link
        to="/sign-in"
        className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary no-underline hover:opacity-90"
      >
        {t('signedOut.logIn')}
      </Link>
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
      <LibraryShelves overview={overview} />
      <ReadingHabitNote />
      <FollowingSection />
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
    <PageContainer className="tmc-rise flex flex-col gap-12 pt-10 pb-14">
      <title>{t('documentTitle')}</title>
      <LibraryHeader />
      {isKnown && (userId === null ? <SignedOutLibrary /> : <SignedInLibrary />)}
    </PageContainer>
  );
}
