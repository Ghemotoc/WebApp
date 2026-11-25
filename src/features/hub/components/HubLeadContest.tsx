/**
 * HubLeadContest: the leading contest on the Writers' hub (user story 1.3, board
 * A03-WritersHub: "The open contest leads").
 *
 * The contest that closes first leads the main column: its deadline (the page's only coloured
 * fact), its name, its facts, how to enter, and "Enter the contest" (quiet) with "Rules and
 * prizes" (text), both opening the contest's own page, where the writer picks which story to
 * enter. The other open contests follow lower down (HubMoreContests).
 * Who shows it: WritersHubPage. What it calls: useHubContests and contestFacts.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine } from '@/components/ui/MetaLine';
import { Notice } from '@/components/ui/Notice';

import { useHubContests } from '../hooks/useHubContests';
import { closingWords, contestFacts } from '../lib/contestFacts';
import { useHubTranslation } from '../registerHubTranslations';

/**
 * Renders the leading contest.
 *
 * @param props.now - today, for the days left
 * @returns the block, or nothing when no contest is open
 */
export function HubLeadContest({ now }: { now: Date }) {
  const { t, i18n } = useHubTranslation();
  const { contests, loadFailed } = useHubContests();
  if (loadFailed) return <Notice tone="error">{t('hub.contests.loadFailed')}</Notice>;
  const contest = contests[0];
  if (contest === undefined) return null;
  const isRomanian = i18n.language === 'ro';
  const name = isRomanian ? contest.nameRo : contest.nameEn;
  const address = `/c/${contest.pageSlug}`;
  return (
    <section aria-labelledby="hub-lead-contest" className="flex flex-col gap-3">
      <MetaLine facts={[{ text: closingWords(contest, now, t), kind: 'deadline' }]} />
      <h2 id="hub-lead-contest" className="m-0 type-heading">
        {name}
      </h2>
      <MetaLine facts={contestFacts(contest, t, isRomanian)} />
      <p className="m-0">{t('hub.contests.howToEnter')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={address}
          aria-label={t('hub.contests.enterLabel', { name })}
          className={buttonClassName({ variant: 'secondary' })}
        >
          {t('hub.contests.enter')}
        </Link>
        <Link to={address} className={buttonClassName({ variant: 'text' })}>
          {t('hub.contests.rules')}
        </Link>
      </div>
    </section>
  );
}
