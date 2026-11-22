/**
 * WritersHubPage: the Home page at /hub, the signed-in home the logo opens (bundle G9 WRITING;
 * since CALM-7c the simplified board New-Home; design rulebook: "When signed in, the logo goes to
 * the Writers' hub").
 *
 * Top to bottom, as on the board: the hero with the writing month; the writer's own invitations
 * (writer of the week, GAPS-12e; a home-page comment, GAPS-13) when there are any; Continue
 * reading beside Drafts; Open for entries now (the contests); Tools for the next chapter (the
 * prompt of the week, GAPS-12c, and the guides); New from writers you follow beside Talk about
 * stories. Then the hub's other parts, which the board leaves out but which stay (Robert, 20 Nov
 * 2026: the redesign keeps every feature): the writer of the week, the learning path (GAPS-12g)
 * and the live sessions (GAPS-12h), with the badges (GAPS-12f), this week's numbers (GAPS-12b),
 * the tools and the calls for submissions (GAPS-12d) beside them on a wide screen.
 * Each pair sits in two columns from 900 px and stacks below that.
 * Left out: the board's 970 × 90 advert, which needs an ad slot of its own (S1-E12-04).
 * Signed out, it says to log in, as Notifications does.
 * Who shows it: the router, at /hub; the logo links here when someone is signed in.
 * What it calls: the Hub* sections below and useSession.
 */
import { Link } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { useSession } from '@/features/auth/hooks/useSession';

import { useHubTranslation } from '../registerHubTranslations';

import { HubCalls } from './HubCalls';
import { HubContests } from './HubContests';
import { HubContinueReading } from './HubContinueReading';
import { HubDrafts } from './HubDrafts';
import { HubFollowingRow } from './HubFollowingRow';
import { HubHero } from './HubHero';
import { HubHomeCommentInvitations } from './HubHomeCommentInvitations';
import { HubMonth } from './HubMonth';
import { HubPath } from './HubPath';
import { HubSessions } from './HubSessions';
import { HubSpotlight } from './HubSpotlight';
import { HubSpotlightInvitations } from './HubSpotlightInvitations';
import { HubTalk } from './HubTalk';
import { HubTools } from './HubTools';
import { HubToolsSection } from './HubToolsSection';
import { HubWeek } from './HubWeek';

/**
 * Two parts side by side from 900 px (board New-Home: the wider one first), stacked below it; a
 * part that has nothing to show leaves the other the whole width.
 */
const twoColumnClasses =
  'grid items-start gap-14 min-[900px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] [&>*:only-child]:col-span-full';

/**
 * The hub for someone signed in.
 *
 * @returns the sections, top to bottom
 */
function HubBody() {
  // One "now" for the whole page, so the hero's day and the days left always agree.
  const now = new Date();
  return (
    <div className="flex flex-col gap-14 pt-10 pb-16">
      <HubHero now={now} />
      <HubSpotlightInvitations />
      <HubHomeCommentInvitations />
      <div className={twoColumnClasses}>
        <HubContinueReading />
        <HubDrafts />
      </div>
      <HubContests now={now} />
      <HubToolsSection now={now} />
      <div className={twoColumnClasses}>
        <HubFollowingRow />
        <HubTalk />
      </div>
      <HubMoreForWriters now={now} />
    </div>
  );
}

/**
 * The hub's other parts, in two columns from a wide screen.
 *
 * @param props.now - today, for the calls' days left
 * @returns the two columns
 */
function HubMoreForWriters({ now }: { now: Date }) {
  return (
    <div className="flex flex-wrap items-start gap-7">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
        <HubSpotlight />
        <HubPath />
        <HubSessions />
      </div>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-7">
        <HubMonth />
        <HubWeek />
        <HubTools />
        <HubCalls now={now} />
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
        <div className="flex flex-col gap-3 pt-14 pb-16">
          <h1 className="m-0 type-display">{t('hub.heading')}</h1>
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
