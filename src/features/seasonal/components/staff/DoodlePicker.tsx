/**
 * DoodlePicker: chooses an occasion's doodle from the approved set shipped with the app, each
 * shown on a light and a night tile (story S1-E11-11 criteria 2 and 4).
 *
 * Staff pick only from the SVG files in the release; there is no upload (S1-E11-11: new doodles
 * arrive as SVG files in a normal release). A radio group, so it works by keyboard: Tab into the
 * group, then the arrow keys. The pictures here are the content being chosen, not decoration of
 * the staff screen, and each choice is named in words.
 * Who shows it: OccasionForm. What it calls: nothing; the parent keeps the choice.
 */
import { useTranslation } from 'react-i18next';

import { doodleSources } from '@/components/ui/doodleSources';
import { cn } from '@/lib/utils';

import {
  seasonalDoodleFiles,
  seasonalDoodleNames,
  type SeasonalDoodleName,
} from '../../lib/seasonalCalendar';

/** What the picker needs. */
interface DoodlePickerProps {
  value: SeasonalDoodleName;
  onChange: (doodle: SeasonalDoodleName) => void;
}

/**
 * One doodle on a light and a night tile, as readers see it in each theme.
 *
 * @returns the two tiles
 */
function DoodleTiles({ doodle }: { doodle: SeasonalDoodleName }) {
  const source = doodleSources[seasonalDoodleFiles[doodle]];
  // The page colours of the light and the night theme (--paper in src/styles/tokens.css), shown
  // side by side whatever theme the staff member uses (S1-E11-11 criterion 4).
  return (
    <span className="flex gap-1" aria-hidden="true">
      <span className="flex size-12 items-center justify-center rounded-md bg-[#FAF8F5]">
        <img src={source} alt="" className="size-10" />
      </span>
      <span className="flex size-12 items-center justify-center rounded-md bg-[#1E0F24]">
        <img src={source} alt="" className="size-10" />
      </span>
    </span>
  );
}

/**
 * Renders the choices.
 *
 * @returns the radio group
 */
export function DoodlePicker({ value, onChange }: DoodlePickerProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 text-sm font-semibold text-ink">{t('seasonal.fields.doodle')}</legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {seasonalDoodleNames.map((doodle) => (
          <label
            key={doodle}
            className={cn(
              'flex min-h-11 cursor-pointer flex-col gap-2 rounded-lg border border-control-border bg-surface p-2',
              doodle === value && 'border-2 border-primary',
            )}
          >
            <DoodleTiles doodle={doodle} />
            <span className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="seasonal-doodle"
                value={doodle}
                checked={doodle === value}
                onChange={() => onChange(doodle)}
                className="size-5"
              />
              {t(`seasonal.doodles.${doodle}`)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
