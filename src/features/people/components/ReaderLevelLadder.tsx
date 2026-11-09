/**
 * ReaderLevelLadder: the four reading levels with what each takes, the current one highlighted
 * (bundle G7a; the Profile board's Reading level card). The same look as the writing rank's
 * ladder: a dot (filled once reached), the level as a glass pill and its rule on the right.
 * Who uses it: ReaderLevelPanel. What it calls: isReaderLevelReached() in ../lib/readerLevels.
 */
import { cn } from '@/lib/utils';

import { isReaderLevelReached, readerLevelLadder, type ReaderLevel } from '../lib/readerLevels';
import { usePeopleTranslation } from '../registerPeopleTranslations';

/**
 * One rung: the dot, the level and its rule; screen readers also hear whether it is reached.
 *
 * @returns the list item
 */
function LadderRow({ rung, current }: { rung: ReaderLevel; current: ReaderLevel | null }) {
  const { t } = usePeopleTranslation();
  const isCurrent = rung === current;
  const isReached = isReaderLevelReached(rung, current);
  // Step 1: the words a screen reader hears after the name.
  let stateWords = t('readerLevel.notYet');
  if (isReached) stateWords = t('readerLevel.reached');
  if (isCurrent) stateWords = t('readerLevel.current');
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
          isReached ? 'bg-heading' : 'border-2 border-control-border bg-surface',
        )}
      />
      <span className="flex-1">
        <span className="button-glass inline-flex h-7 items-center rounded-full px-3 text-[13px] leading-none whitespace-nowrap">
          {t(`readerLevel.names.${rung}`)}
        </span>
        <span className="sr-only">, {stateWords}</span>
      </span>
      <span className="ml-auto max-w-[55%] text-right text-[13px] font-normal text-meta">
        {t(`readerLevel.rules.${rung}`)}
      </span>
    </li>
  );
}

/**
 * Renders the ladder.
 *
 * @param props.current - the reader's level, or null before the first chapter read
 * @returns the ordered list of levels
 */
export function ReaderLevelLadder({ current }: { current: ReaderLevel | null }) {
  const { t } = usePeopleTranslation();
  return (
    <ol aria-label={t('readerLevel.ladderLabel')} className="m-0 flex list-none flex-col gap-2 p-0">
      {readerLevelLadder.map((rung) => (
        <LadderRow key={rung} rung={rung} current={current} />
      ))}
    </ol>
  );
}
