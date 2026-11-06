/**
 * FeaturedControls: the dots, arrows and pause button under Featured this week (story S1-E5-10;
 * board Discover, "Controls").
 *
 * Each dot is a button that shows one story (marked aria-current); the arrows step through them
 * and the pause button stops the band turning by itself (aria-pressed). Every button is at least
 * 36 px (CLAUDE.md rule 9: 24 px minimum). With one story there is nothing to step through, so
 * the band shows no controls at all.
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

/** The round buttons' shared look: 36 px, plum icon, a light hover. */
const roundButton =
  'inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-primary hover:bg-tint';

/**
 * Renders the controls.
 *
 * @returns the control bar
 */
export function FeaturedControls(props: FeaturedControlsProps) {
  const { titles, index, isPaused } = props;
  const { t } = useDiscoveryTranslation();
  return (
    <div className="absolute bottom-6 left-[clamp(24px,4vw,56px)] flex flex-wrap items-center gap-2.5 rounded-full border border-border bg-surface/95 p-1.5">
      {titles.map((title, dotIndex) => (
        <button
          key={title + String(dotIndex)}
          type="button"
          aria-label={t('featured.showSlide', { position: dotIndex + 1, title })}
          aria-current={dotIndex === index ? 'true' : undefined}
          onClick={() => props.goTo(dotIndex)}
          className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
        >
          <span
            aria-hidden="true"
            className={
              dotIndex === index
                ? 'h-2.5 w-6 rounded-full bg-primary'
                : 'size-2.5 rounded-full bg-control-border'
            }
          />
        </button>
      ))}
      <button
        type="button"
        aria-label={t('featured.previous')}
        onClick={props.previous}
        className={roundButton}
      >
        <ChevronLeftIcon size={18} />
      </button>
      <button
        type="button"
        aria-label={t('featured.next')}
        onClick={props.next}
        className={roundButton}
      >
        <ChevronRightIcon size={18} />
      </button>
      <button
        type="button"
        aria-label={t('featured.pause')}
        aria-pressed={isPaused}
        onClick={props.togglePause}
        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-primary text-on-primary"
      >
        {isPaused ? <PlayIcon /> : <PauseIcon />}
      </button>
    </div>
  );
}
