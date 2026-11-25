/**
 * MemberHomePage: Home for someone signed in, at / (user story 1.1, board A01-Home; until 25 Nov
 * 2026 this was the top of /hub, bundle G9 WRITING and CALM-7c).
 *
 * Top to bottom, as on the board: the hero with what changed and the writing month; the writer's
 * own invitations (writer of the week, GAPS-12e; a home-page comment, GAPS-13) when there are any;
 * Continue reading beside Drafts; Open for entries now (the contests); Tools for the next chapter
 * (the prompt of the week, GAPS-12c, and the guides); New from writers you follow beside Talk
 * about stories. The Writers' hub's own parts (learning path, live sessions, badges, this week's
 * numbers, calls for submissions) live at /hub (board A03, WritersHubPage).
 * Each pair sits in two columns from 900 px and stacks below that.
 * Left out: the board's 970 × 90 advert, which needs an ad slot of its own (S1-E12-04).
 * Who shows it: WebsiteHomePage, at /, when someone is signed in (the logo links to /).
 * What it calls: the Hub* sections below.
 */
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';

import { useHubTranslation } from '../registerHubTranslations';

import { HubContests } from './HubContests';
import { HubContinueReading } from './HubContinueReading';
import { HubDrafts } from './HubDrafts';
import { HubFollowingRow } from './HubFollowingRow';
import { HubHero } from './HubHero';
import { HubHomeCommentInvitations } from './HubHomeCommentInvitations';
import { HubSpotlightInvitations } from './HubSpotlightInvitations';
import { HubTalk } from './HubTalk';
import { HubToolsSection } from './HubToolsSection';

/**
 * Two parts side by side from 900 px (board A01: the wider one first), stacked below it; a part
 * that has nothing to show leaves the other the whole width.
 */
const twoColumnClasses =
  'grid items-start gap-12 min-[900px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] [&>*:only-child]:col-span-full';

/**
 * Renders Home for a signed-in member.
 *
 * @returns the page
 */
export function MemberHomePage() {
  const { t } = useHubTranslation();
  // One "now" for the whole page, so the hero's day and the days left always agree.
  const now = new Date();
  return (
    <PageContainer>
      <title>{t('hub.homeDocumentTitle', { productName: brand.productName })}</title>
      <div className="flex flex-col gap-12 pt-8 pb-16">
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
      </div>
    </PageContainer>
  );
}
