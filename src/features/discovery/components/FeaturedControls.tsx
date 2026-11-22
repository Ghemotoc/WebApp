/**
 * FeaturedControls: the dots, arrows and pause button under Featured this week (story S1-E5-10;
 * board Discover, "Controls").
 *
 * Board values (simplified board New-Read, CALM-7c): one row under the slide, in the board's
 * order: the quiet Pause pill with its words, the round Previous button, the dots (44 px targets,
 * an 8 px dot that widens for the current story) and the round Next button. Each dot is a button that
 * shows one story (marked aria-current); the arrows step through them and the pill stops or starts
 * the band turning by itself. The pill says what it will do, "Pause slideshow" or "Play
 * slideshow" (canvas v38; Robert via DESIGN, 20 Nov 2026, 21:03 UTC; CALM-1b), and its visible
 * words are its whole name, so voice control finds it (WCAG 2.5.3). Because the words change, it
 * carries no aria-pressed: a toggle that also renames itself would be announced twice. Every button is 44 px tall (CLAUDE.md rule 9: 24 px minimum).
 * With one story there is nothing to step through, so the band shows no controls at all.
 * Who shows it: FeaturedBand.
 */
import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';
import { PauseIcon } from '@/components/icons/PauseIcon';
import { PlayIcon } from '@/components/icons/PlayIcon';

import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** What the controls need. */
export interface FeaturedControlsProps {
  titles: string[];
  index: number;
  isPaused: boolean;
  goTo: (index: number) => void;
  next: () => void;
  previous: () => void;
  togglePause: () => void;
}

/** The round arrow buttons' shared look: 44 px glass circles. */
const roundButton =
  'inline-flex size-11 cursor-pointer items-center justify-center rounded-full button-glass';

/**
 * The dots, one button per story (44 px targets around an 8 px dot that widens for the current
 * story, drawn in the thread colour).
 *
 * @param props.titles - the stories' titles, for each dot's name
 * @param props.index - the story showing now
 * @param props.goTo - shows one story
 * @returns the dots
 */
function SlideDots({
  titles,
  index,
  goTo,
}: Pick<FeaturedControlsProps, 'titles' | 'index' | 'goTo'>) {
  const { t } = useDiscoveryTranslation();
  return (
    <div className="flex items-center">
      {titles.map((title, dotIndex) => (
        <button
          key={title + String(dotIndex)}
          type="button"
          aria-label={t('featured.showSlide', { position: dotIndex + 1, title })}
          aria-current={dotIndex === index ? 'true' : undefined}
          onClick={() => goTo(dotIndex)}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
        >
          <span
            aria-hidden="true"
            className={
              dotIndex === index
                ? 'h-2 w-6 rounded-full bg-(--thread)'
                : 'size-2 rounded-full bg-control-border'
            }
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Renders the controls.
 *
 * @returns the control bar
 */
export function FeaturedControls(props: FeaturedControlsProps) {
  const { isPaused } = props;
  const { t } = useDiscoveryTranslation();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {/* The pill names the next action: Play while paused, Pause while turning. */}
      <button
        type="button"
        onClick={props.togglePause}
        className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full button-glass px-4 text-sm font-semibold"
      >
        {isPaused ? <PlayIcon /> : <PauseIcon />}
        {isPaused ? t('featured.play') : t('featured.pause')}
      </button>
      <button
        type="button"
        aria-label={t('featured.previous')}
        onClick={props.previous}
        className={roundButton}
      >
        <ChevronLeftIcon size={18} />
      </button>
      <SlideDots titles={props.titles} index={props.index} goTo={props.goTo} />
      <button
        type="button"
        aria-label={t('featured.next')}
        onClick={props.next}
        className={roundButton}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}
