/**
 * WritersHubPage: the Writers' hub at /hub (user story 1.3, board A03-WritersHub; until 25 Nov 2026
 * /hub was also the signed-in Home, which now lives at /, MemberHomePage).
 *
 * As on the board: the hero (title, Start writing and the words written this month), then two
 * columns from 900 px. Left, the wider one: the lead contest, the prompt of the week (GAPS-12c),
 * the writing guides, the seven-day learning path (GAPS-12g), the live sessions (GAPS-12h), more
 * contests and the calls for submissions (GAPS-12d). Right: the writer of the week (GAPS-12e), the
 * tools, this week's numbers (GAPS-12b) and the badges (GAPS-12f). Below 900 px the right column
 * follows the left.
 * Left out: the board's two adverts (728 × 90 and the column box), which need an ad slot of their
 * own (S1-E12-04; docs/board-fixes.md).
 * Signed out, it says to log in, as Notifications does.
 * Who shows it: the router, at /hub. What it calls: the Hub* sections below and useSession.
 */
import { Link } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';

import { useHubTranslation } from '../registerHubTranslations';

import { HubCalls } from './HubCalls';
import { HubGuideRows } from './HubGuideRows';
import { HubLeadContest } from './HubLeadContest';
import { HubMonth } from './HubMonth';
import { HubMoreContests } from './HubMoreContests';
import { HubPath } from './HubPath';
import { HubPrompt } from './HubPrompt';
import { HubSessions } from './HubSessions';
import { HubSpotlight } from './HubSpotlight';
import { HubTools } from './HubTools';
import { HubWeek } from './HubWeek';
import { HubWritersHero } from './HubWritersHero';

/**
 * The hub for someone signed in: the hero, then the two columns of board A03 (1.7 : 1, 64 px
 * apart from 900 px; 48 px between parts).
 *
 * @returns the sections, top to bottom
 */
function HubBody() {
  // One "now" for the whole page, so the hero's day and the days left always agree.
  const now = new Date();
  return (
    <div className="flex flex-col gap-12 pt-8 pb-16">
      <HubWritersHero now={now} />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-12 min-[900px]:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] min-[900px]:gap-16">
        <div className="flex min-w-0 flex-col gap-12">
          <HubLeadContest now={now} />
          <HubPrompt now={now} />
          <HubGuideRows />
          <HubPath />
          <HubSessions />
          <HubMoreContests now={now} />
          <HubCalls now={now} />
        </div>
        <div className="flex min-w-0 flex-col gap-12">
          <HubSpotlight />
          <HubTools />
          <HubWeek />
          <HubMonth />
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
        <div className="flex flex-col gap-3 pt-12 pb-16">
          <h1 className="m-0 type-display">{t('hub.heading')}</h1>
          <p className="m-0 text-ink-muted">
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
