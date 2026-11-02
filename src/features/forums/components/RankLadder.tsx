/**
 * RankLadder: the four ranks as an ordered list inside the rank card (story S1-E8-09; board 6.1).
 *
 * Board values: rows 8 px apart with 8 px × 12 px padding and 12 px corners, 14 px text; a 10 px
 * dot (filled plum when reached, white with a #B9A9C2 ring when not), the rank's 28 px sticker
 * (faded to 0.45 when not reached), the name, and the rule at the right in 13 px meta text. The
 * current rank's row sits on the #F1EAF4 tint in bold plum. A fine line between rows pairs each
 * name with its rule (DoD, label rows). Reached or not is said in words for screen readers, not
 * by colour alone.
 * Who uses it: RankPanel. It calls nothing.
 */
import { Doodle } from '@/components/ui/Doodle';
import { cn } from '@/lib/utils';

import { isRankReached, rankLadder, type RankRung, type WriterRank } from '../lib/writerRanks';
import { useForumsTranslation } from '../registerForumsTranslations';

/**
 * One row of the ladder.
 *
 * @param props.rung - the rank this row shows
 * @param props.current - the writer's rank
 * @returns the list item
 */
function LadderRow({ rung, current }: { rung: RankRung; current: WriterRank }) {
  const { t } = useForumsTranslation();
  const isCurrent = rung.rank === current;
  const isReached = isRankReached(rung.rank, current);
  // Step 1: the words a screen reader hears after the name.
  let stateWords = t('rank.notYet');
  if (isReached) stateWords = t('rank.reached');
  if (isCurrent) stateWords = t('rank.current');
  return (
    <li
      aria-current={isCurrent ? 'step' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm',
        isCurrent ? 'bg-tint font-bold text-heading' : 'text-ink',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 flex-none rounded-full',
          isReached ? 'bg-[#672786]' : 'border-2 border-[#B9A9C2] bg-surface',
        )}
      />
      <span className={cn('relative size-7 flex-none', !isReached && 'opacity-45')}>
        <Doodle
          name={rung.sticker}
          kind="widget"
          on={`The ${rung.rank} row`}
          hideBelow="always"
          className="size-7"
        />
      </span>
      <span className="flex-1">
        {t(`rank.names.${rung.rank}`)}
        <span className="sr-only">, {stateWords}</span>
      </span>
      <span className="ml-auto max-w-[55%] text-right text-[13px] font-normal text-meta">
        {t(`rank.rules.${rung.rank}`)}
      </span>
    </li>
  );
}

/**
 * Renders the list.
 *
 * @param props.current - the writer's rank
 * @returns the ordered list of ranks
 */
export function RankLadder({ current }: { current: WriterRank }) {
  const { t } = useForumsTranslation();
  return (
    <ol aria-label={t('rank.ladderLabel')} className="m-0 flex list-none flex-col gap-2 p-0">
      {rankLadder.map((rung) => (
        <LadderRow key={rung.rank} rung={rung} current={current} />
      ))}
    </ol>
  );
}
