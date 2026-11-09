/**
 * FeaturedControls: the dots, arrows and pause button under Featured this week (story S1-E5-10;
 * board Discover, "Controls").
 *
 * Board values (liquid glass board Discover, bundle G7): a row under the slide with the dots on the
 * left (44 px targets, an 8 px bar that widens for the current story) and, on the right, the glass
 * Pause pill with its word, then the round previous and next buttons. Each dot is a button that
 * shows one story (marked aria-current); the arrows step through them and Pause stops the band
 * turning by itself (aria-pressed). Its visible word ("Pause") is the start of its name, so voice
 * control finds it (WCAG 2.5.3). Every button is 44 px tall (CLAUDE.md rule 9: 24 px minimum).
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
 * Renders the controls.
 *
 * @returns the control bar
 */
export function FeaturedControls(props: FeaturedControlsProps) {
  const { titles, index, isPaused } = props;
  const { t } = useDiscoveryTranslation();
  return (
    <div className="relative mt-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center">
        {titles.map((title, dotIndex) => (
          <button
            key={title + String(dotIndex)}
            type="button"
            aria-label={t('featured.showSlide', { position: dotIndex + 1, title })}
            aria-current={dotIndex === index ? 'true' : undefined}
            onClick={() => props.goTo(dotIndex)}
            className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent"
          >
            <span
              aria-hidden="true"
              className={
                dotIndex === index
                  ? 'h-2 w-6 rounded-full bg-primary'
                  : 'size-2 rounded-full bg-control-border'
              }
            />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={t('featured.pause')}
          aria-pressed={isPaused}
          onClick={props.togglePause}
          className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full button-glass px-4 text-sm font-semibold"
        >
          {isPaused ? <PlayIcon /> : <PauseIcon />}
          <span aria-hidden="true">{t('featured.pauseShort')}</span>
        </button>
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
      </div>
    </div>
  );
}
