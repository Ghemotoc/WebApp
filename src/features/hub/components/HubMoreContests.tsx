/**
 * HubMoreContests: the open contests after the leading one, as plain rows under "More contests"
 * (user story 1.3, board A03-WritersHub).
 * Who shows it: WritersHubPage. What it calls: useHubContests, contestFacts and HubRows.
 */
import { useHubContests } from '../hooks/useHubContests';
import { closingWords, contestFacts } from '../lib/contestFacts';
import { useHubTranslation } from '../registerHubTranslations';

import { HubRows, type HubRow } from './HubRows';

/**
 * Renders the other open contests as rows.
 *
 * @param props.now - today, for the days left
 * @returns the section, or nothing when only one contest (or none) is open
 */
export function HubMoreContests({ now }: { now: Date }) {
  const { t, i18n } = useHubTranslation();
  const { contests } = useHubContests();
  const rest = contests.slice(1);
  if (rest.length === 0) return null;
  const isRomanian = i18n.language === 'ro';
  const rows: HubRow[] = rest.map((contest) => ({
    key: contest.contestId,
    title: isRomanian ? contest.nameRo : contest.nameEn,
    href: `/c/${contest.pageSlug}`,
    facts: [{ text: closingWords(contest, now, t) }, ...contestFacts(contest, t, isRomanian)],
  }));
  return <HubRows headingId="hub-more-contests" heading={t('hub.contests.more')} rows={rows} />;
}
