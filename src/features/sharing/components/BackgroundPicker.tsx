/**
 * BackgroundPicker: "Background" on the quote card (story S1-E4-07, fourth criterion; board 3.6)
 * and, since IDEAS-1c, on the picture card too.
 *
 * Board values: an eyebrow, the "Purple" chip (the default), then "Or one of our colours:" and
 * nine round swatches. Every choice is a toggle button with aria-pressed and a tick when chosen,
 * never colour alone (DoD pill system); each swatch is named ("Gold") and 44 px across.
 * The quote card also offers "Story cover" and "Own picture" (bundle GAPS-7, parts b and c):
 * the dialog passes `pictures`, and the picker adds the cover chip, the reader's own picture and
 * the board's note that pictures are blurred. The picture card doesn't pass it: its picture is
 * the chapter's own.
 * Who uses it: QuoteCardDialog and PictureCardDialog. What it calls: OwnPictureChoice.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Chip } from '@/components/ui/Chip';
import { CheckIcon } from '@/components/icons/CheckIcon';

import type { QuoteCardPicture } from '../hooks/useQuoteCardPicture';
import { coverBackgroundKey } from '../lib/coverBackground';
import { paletteBackgrounds, purpleBackground, type QuoteCardBackground } from '../lib/quoteCard';

import { OwnPictureChoice } from './OwnPictureChoice';

/** The picture choices the quote card adds (GAPS-7). */
export interface PictureChoices {
  /** True once the story's cover is known. */
  hasCover: boolean;
  onChooseCover: () => void;
  /** The reader's own picture. */
  own: QuoteCardPicture;
  /** The key the picker gives the reader's own picture. */
  ownKey: string;
  onChooseOwn: () => void;
}

/** What the picker needs. */
export interface BackgroundPickerProps {
  chosen: QuoteCardBackground;
  onChoose: (background: QuoteCardBackground) => void;
  /** "Story cover" and "Own picture"; left out on the picture card. */
  pictures?: PictureChoices;
}

/**
 * One round colour swatch.
 *
 * @returns the swatch button
 */
function Swatch(props: {
  background: QuoteCardBackground;
  isChosen: boolean;
  label: string;
  onChoose: () => void;
}) {
  const tickColour = props.background.isLight ? 'text-[#2A0E33]' : 'text-white';
  return (
    <button
      type="button"
      aria-pressed={props.isChosen}
      aria-label={props.label}
      title={props.label}
      onClick={props.onChoose}
      style={{ backgroundColor: props.background.colours[0] }}
      className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-control-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring)"
    >
      {props.isChosen && <CheckIcon className={tickColour} />}
    </button>
  );
}

/**
 * Renders the picker.
 *
 * @returns the group of choices
 */
export function BackgroundPicker({ chosen, onChoose, pictures }: BackgroundPickerProps) {
  const { t } = useTranslation('sharing');
  const headingId = useId();
  const coloursId = useId();
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-3">
      <p id={headingId} className="m-0 eyebrow">
        {t('quote.background')}
      </p>
      <div className="flex flex-wrap items-center gap-2.5">
        <Chip
          isPressed={chosen.key === purpleBackground.key}
          onPressedChange={() => onChoose(purpleBackground)}
        >
          {t('quote.purple')}
        </Chip>
        {pictures?.hasCover === true && (
          <Chip
            isPressed={chosen.key === coverBackgroundKey}
            onPressedChange={pictures.onChooseCover}
          >
            {t('quote.cover')}
          </Chip>
        )}
      </div>
      <div role="group" aria-labelledby={coloursId} className="flex flex-wrap items-center gap-2.5">
        <span id={coloursId} className="text-sm font-semibold text-ink">
          {t('quote.ourColours')}
        </span>
        {paletteBackgrounds.map((background) => (
          <Swatch
            key={background.key}
            background={background}
            isChosen={chosen.key === background.key}
            label={t(`quote.colours.${background.key}`)}
            onChoose={() => onChoose(background)}
          />
        ))}
      </div>
      {pictures !== undefined && (
        <>
          <OwnPictureChoice
            own={pictures.own}
            isChosen={chosen.key === pictures.ownKey}
            onChoose={pictures.onChooseOwn}
          />
          <p className="m-0 text-sm text-body">{t('quote.picturesBlurred')}</p>
        </>
      )}
    </div>
  );
}
