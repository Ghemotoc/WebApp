/**
 * contestFacts: the words the Writers' hub shows about an open contest (user story 1.3, board
 * A03-WritersHub): its deadline and its facts.
 * Who calls it: HubLeadContest and HubMoreContests. What it calls: hubDates.
 */
import type { HubContest } from '../api/hubContests';
import type { MetaFact } from '@/components/ui/MetaLine';
import type { useHubTranslation } from '../registerHubTranslations';

import { daysUntilClose } from './hubDates';

export type Translate = ReturnType<typeof useHubTranslation>['t'];

/**
 * The contest's facts: the word limit, the prize and the entries so far.
 *
 * @returns the facts, each only when it is known
 */
export function contestFacts(contest: HubContest, t: Translate, isRomanian: boolean): MetaFact[] {
  const facts: MetaFact[] = [];
  if (contest.wordLimit !== null) {
    const words = contest.wordLimit.toLocaleString(isRomanian ? 'ro' : 'en-GB');
    facts.push({ text: t('hub.contests.wordLimit', { count: contest.wordLimit, words }) });
  }
  const prize = isRomanian ? contest.prizeRo : contest.prizeEn;
  if (prize !== '') facts.push({ text: t('hub.contests.prize', { prize }) });
  if (contest.entryCount > 0) {
    facts.push({ text: t('hub.contests.entries', { count: contest.entryCount }) });
  }
  return facts;
}

/**
 * "Closes in 23 days", or "Closes today" on the last day.
 *
 * @returns the words
 */
export function closingWords(contest: HubContest, now: Date, t: Translate): string {
  const daysLeft = daysUntilClose(contest.entriesCloseOn, now);
  if (daysLeft === 0) return t('hub.contests.closesToday');
  return t('hub.contests.closesIn', { count: daysLeft });
}
