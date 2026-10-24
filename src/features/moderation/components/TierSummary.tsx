/**
 * TierSummary: the four tier cards at the top of the queue, each with its open count and what
 * belongs in it (story S1-E10-03a; board 8.2: "1 hour · 1 open · Removal orders…").
 *
 * The tiers were decided on 23 Oct 2026 (Q5): same day for self-harm, sexual content involving a
 * minor and terrorist content; 48 hours for other illegal content, copyright and copied work; 7
 * days for the rest; the one-hour tier only for removal orders from an authority (TCO regulation
 * (EU) 2021/784, art. 3(3)). The counts cover every open case the person may see, whatever the
 * filters say.
 * Who shows it: ModerationQueuePage.
 */
import { useTranslation } from 'react-i18next';

import type { CaseTier, QueueCase } from '../api/moderationQueue';

/** The tiers from the most urgent down, as the cards are laid out. */
const tiersInOrder: CaseTier[] = ['one_hour', 'same_day', 'two_days', 'seven_days'];

/** The left edge of each card, from the board (red, pink, gold, grey). */
const edgeOf: Record<CaseTier, string> = {
  one_hour: 'border-l-destructive',
  same_day: 'border-l-(--pill-blush-border)',
  two_days: 'border-l-(--pill-gold-border)',
  seven_days: 'border-l-border',
};

/**
 * Renders the cards.
 *
 * @param props.openCases - every open case the person may see
 * @returns the four cards
 */
export function TierSummary({ openCases }: { openCases: QueueCase[] }) {
  const { t } = useTranslation('moderation');
  return (
    <ul
      aria-label={t('tierSummary.heading')}
      className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4"
    >
      {tiersInOrder.map((tier) => {
        const count = openCases.filter((theCase) => theCase.tier === tier).length;
        return (
          <li
            key={tier}
            className={`flex flex-col gap-1 rounded-card border border-border border-l-4 bg-surface p-5 shadow-card ${edgeOf[tier]}`}
          >
            <span className="font-eyebrow text-sm text-eyebrow">{t(`tiers.${tier}`)}</span>
            <span className="font-heading text-[26px] font-bold text-heading">
              {t('tierSummary.open', { count })}
            </span>
            <span className="text-sm text-body">{t(`tierSummary.${tier}`)}</span>
          </li>
        );
      })}
    </ul>
  );
}
