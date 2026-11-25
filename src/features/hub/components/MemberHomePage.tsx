/**
 * MemberHomePage: Home for someone signed in, at / (user story 1.1, board A01-Home; until 25 Nov
 * 2026 this was the top of /hub, bundle G9 WRITING and CALM-7c).
 *
 * Top to bottom, as on the board: the hero (the greeting, what waits, the story read last and the
 * writing month); the writer's own invitations (writer of the week, GAPS-12e; a home-page
 * comment, GAPS-13) when there are any; then full-width rows and bands: Continue reading, Drafts,
 * Open for entries now (the contests, in a tinted band), New from writers you follow, Tools for
 * the next chapter (the dark band: the prompt of the week, GAPS-12c, rising writers and the
 * guides), Trending this week with its genre chips, Completed stories (the website home page's
 * shelves, HomeShelves) and Talk about stories (a tinted band). The Writers' hub's own parts
 * (learning path, live sessions, badges, this week's numbers, calls for submissions) live at /hub
 * (board A03, WritersHubPage).
 * After the contests sits the page's one wide advert (slot home_wide, Robert's review of 25 Nov
 * 2026), filled by the server like every other slot (PageAdSlot).
 * Who shows it: WebsiteHomePage, at /, when someone is signed in (the logo links to /).
 * What it calls: the Hub* sections below, PageAdSlot and HomeShelves.
 */
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { PageAdSlot } from '@/features/ads/components/PageAdSlot';
import { HomeShelves } from '@/features/website/components/HomeShelves';

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
        <HubContinueReading />
        <HubDrafts />
        <HubContests now={now} />
        {/* Board A01: the page's one wide advert, after the contests (slot home_wide; staff turn
            it off or book it in Sponsors › Placements). */}
        <PageAdSlot pageKey="home" position={1} className="mx-auto w-full max-w-[970px]" />
        <HubFollowingRow />
        <HubToolsSection now={now} />
        <HomeShelves />
        <HubTalk />
      </div>
    </PageContainer>
  );
}
