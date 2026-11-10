/**
 * WritersHubPage: the Writers' hub at /hub, the signed-in home (bundle G9 WRITING, part a; board
 * WritersHub; design rulebook: "When signed in, the logo goes to the Writers' hub").
 *
 * Top to bottom, as on the board: the hero, then the open contests and the how-to guides in the
 * wide column, with this week's numbers (GAPS-12b) and the tools beside them on a wide screen and
 * under them on a phone or tablet.
 * Built only from parts with something real behind them; the board's prompt of the week, learning
 * path, live sessions, writing month, writer of the week, calls for submissions and badges wait
 * for their own parts of GAPS-12 (docs/board-fixes.md). The ad slot waits for S1-E12-04.
 * Signed out, it says to log in, as Notifications does.
 * Who shows it: the router, at /hub; the logo links here when someone is signed in.
 * What it calls: HubHero, HubContests, HubGuides, HubWeek and HubTools; useSession.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';

import { useHubTranslation } from '../registerHubTranslations';

import { HubContests } from './HubContests';
import { HubGuides } from './HubGuides';
import { HubHero } from './HubHero';
import { HubTools } from './HubTools';
import { HubWeek } from './HubWeek';

/**
 * The hub for someone signed in.
 *
 * @returns the hero and the two columns
 */
function HubBody() {
  // One "now" for the whole page, so the eyebrow's day and the days left always agree.
  const now = new Date();
  return (
    <div className="flex flex-col gap-7 pt-10 pb-16">
      <HubHero now={now} />
      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          <HubContests now={now} />
          <HubGuides />
        </div>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-7">
          <HubWeek />
          <HubTools />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the page: the hub when signed in, a log-in line when not.
 *
 * @returns the page
 */
export function WritersHubPage() {
  const { t } = useHubTranslation();
  const { userId, isKnown } = useSession();
  return (
    <PageContainer>
      <title>{t('hub.documentTitle', { productName: brand.productName })}</title>
      {isKnown && userId === null && (
        <div className="flex flex-col gap-2 pt-14 pb-16">
          <Eyebrow>{t('hub.signedOutEyebrow')}</Eyebrow>
          <h1 className="page-title">{t('hub.heading')}</h1>
          <p className="m-0 text-body">
            {t('hub.signedOut')}{' '}
            <Link to="/sign-in" className="text-link underline">
              {t('hub.logIn')}
            </Link>
          </p>
        </div>
      )}
      {userId !== null && <HubBody />}
    </PageContainer>
  );
}
