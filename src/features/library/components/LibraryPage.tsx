/**
 * LibraryPage: the reader's library, screen 3.7 (story S1-E4-03; design/boards/Library.dc.html).
 *
 * Who shows it: the router, at /library; the top bar's "Library" link leads here.
 * What it shows, top to bottom as on the board: the eyebrow, "Your library", the line about the
 * place being kept on every device and the "Private" note (S1-E4-03, third criterion: the library
 * is private, and no setting shares it yet); ContinueReading; LibraryShelves (Reading, Saved for
 * later, Finished); FollowingSection. A signed-out visitor gets a card asking them to log in.
 * Not yet, as noted in docs/board-fixes.md: the ad slot (S1-E12-01), "Your lists" (no story
 * builds reading lists yet) and "Downloaded to read offline" (the apps, S1-E4-08), and the
 * "Change" link beside "Private" (privacy settings, S1-E13-01).
 * What it calls: useLibraryOverview → my_library(); the sections call their own reads.
 */
import { Link } from 'react-router';

import { Doodle } from '@/components/ui/Doodle';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useSession } from '@/features/auth/hooks/useSession';

import { useLibraryOverview } from '../hooks/useLibraryOverview';
import { useLibraryTranslation } from '../registerLibraryTranslations';

import { ContinueReading } from './ContinueReading';
import { FollowingSection } from './FollowingSection';
import { LibraryShelves } from './LibraryShelves';

/** The page's heading block, with the "Private" note. */
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
      <p className="m-0 w-fit rounded-full bg-tint px-4 py-2.5 text-sm text-body">
        <strong className="font-bold text-heading">{t('private.lead')}</strong> {t('private.body')}
      </p>
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
