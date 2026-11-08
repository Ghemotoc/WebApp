/**
 * LookTiles: the six year-round themes as tiles to pick from, in Settings › Appearance (bundle
 * G2 THEMES; design/boards Settings.dc.html, "Appearance": 112 by 76 px tiles with a 16 px radius,
 * the page colour with its three blobs and an accent bar, the name underneath).
 *
 * Each tile is a real radio button (hidden) with the tile and name as its label, so the group
 * works with arrow keys and a screen reader hears "Peach sorbet, radio button, 2 of 6". The tile
 * itself carries data-look-swatch, which gives it that look's day colours whatever the page shows
 * (src/styles/tokens.css, "Swatches"). The picked tile has a 3 px ring and a tick, so the choice
 * never rests on colour alone (WCAG 1.4.1); the ring uses the page's focus colour, which stays
 * visible at night too.
 * Who shows it: AppearanceSettingsSection. What it calls: nothing; it reports the pick upwards.
 */
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { yearRoundLooks, type YearRoundLook } from '@/lib/looks';

/** What the tiles need. */
export interface LookTilesProps {
  picked: YearRoundLook;
  onPick: (look: YearRoundLook) => void;
}

/**
 * The drawing on one tile: the look's page colour, its three blobs and its accent bar. Purely
 * decorative; the name under it is the label.
 *
 * @returns the swatch
 */
function LookSwatch({ look, isPicked }: { look: YearRoundLook; isPicked: boolean }) {
  const ring = isPicked ? 'shadow-[0_0_0_3px_var(--focus-ring)]' : 'border border-control-border';
  return (
    // The ring sits outside the swatch, so it takes the page's colours, not the tile's look.
    <span aria-hidden="true" className={`relative block h-[76px] w-[112px] rounded-2xl ${ring}`}>
      <span
        data-look-swatch={look}
        className="look-swatch absolute inset-0 overflow-hidden rounded-2xl"
      >
        <span className="absolute inset-x-3 bottom-3 h-[18px] rounded-full border border-white/90 bg-accent" />
      </span>
      {isPicked && (
        <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary text-on-primary">
          <CheckIcon />
        </span>
      )}
    </span>
  );
}

/**
 * Renders the group of tiles.
 *
 * @returns the fieldset
 */
export function LookTiles({ picked, onPick }: LookTilesProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="sr-only">{t('appearance.themeLegend')}</legend>
      <div className="flex flex-wrap gap-x-3.5 gap-y-4">
        {yearRoundLooks.map((look) => {
          const isPicked = look === picked;
          return (
            <label
              key={look}
              className="flex w-[112px] cursor-pointer flex-col items-center gap-2 rounded-2xl text-center text-[13px] text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-(--focus-ring)"
            >
              <input
                type="radio"
                name="appearance-look"
                value={look}
                checked={isPicked}
                onChange={() => onPick(look)}
                className="sr-only"
              />
              <LookSwatch look={look} isPicked={isPicked} />
              <span className={isPicked ? 'font-bold' : 'font-medium'}>
                {t(`appearance.looks.${look}`)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
