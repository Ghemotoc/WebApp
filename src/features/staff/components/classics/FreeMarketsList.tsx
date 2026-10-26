/**
 * FreeMarketsList: where a classic is in the public domain, one line per market (story S1-E11-16
 * AC 2): Romania, the EU, the UK and the US, each "Free", "Not yet" or "Unknown".
 *
 * Who shows it: ClassicWorkForm (as staff type) and ClassicCard (the saved check).
 * What it calls: nothing; the answer comes in as props. Staff screens use plain components.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

import type { FreeMarkets } from '../../api/classics';

/** The markets in the order they are listed. */
const markets = ['RO', 'EU', 'UK', 'US'] as const;

/**
 * The pill's word and colour for one answer.
 *
 * @param answer - free (true), not yet (false) or unknown (null)
 * @returns the text key's last part and the pill tone
 */
function pillFor(answer: boolean | null): { word: string; tone: 'sage' | 'blush' | 'neutral' } {
  if (answer === null) return { word: 'unknown', tone: 'neutral' };
  if (answer) return { word: 'free', tone: 'sage' };
  return { word: 'notYet', tone: 'blush' };
}

/**
 * Renders the list.
 *
 * @param props.freeMarkets - the check, or null when the author's year is missing
 * @returns the list, or a line asking for the year
 */
export function FreeMarketsList({ freeMarkets }: { freeMarkets: FreeMarkets | null }) {
  const { t } = useTranslation('staff');
  if (freeMarkets === null) {
    return <p className="m-0 text-sm text-meta">{t('classics.check.needsYear')}</p>;
  }
  return (
    <ul aria-label={t('classics.check.heading')} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {markets.map((market) => {
        const pill = pillFor(freeMarkets[market]);
        return (
          <li key={market} className="flex items-center gap-1.5 text-sm text-body">
            {t(`classics.check.markets.${market}`)}
            <InfoPill tone={pill.tone}>{t(`classics.check.${pill.word}`)}</InfoPill>
          </li>
        );
      })}
    </ul>
  );
}
