/**
 * CardColourField: "Colour for quote and picture cards" in the story's settings (bundle IDEAS-1,
 * part c; idea IDEA-20261031-10).
 *
 * The writer picks one of our nine palette colours, or keeps our default. Readers' new quote and
 * picture cards for this story then start in it, and each reader can still change the colour on
 * their own card (the idea's second criterion). It is one native drop-down in the shared style
 * (DoD drop-downs), with a round preview of the colour beside it that screen readers skip,
 * because the drop-down already names the colour.
 * Who uses it: StoryStatusSection. What it calls: nothing; the settings form saves it through
 * update_my_story().
 */
import { useTranslation } from 'react-i18next';

import { coverPalette, type CoverColourKey } from '@/components/covers/coverDesigns';
import { Select } from '@/components/ui/Select';
import { cardColourKeys } from '@/schemas/story';

/** The drop-down's value for "our default" (stored as null). */
const ourDefault = 'default';

/** What the field needs. */
export interface CardColourFieldProps {
  /** The chosen palette key, or null for our default. */
  value: string | null;
  onChange: (value: string | null) => void;
}

/**
 * The colour's hex value for the preview circle.
 *
 * @param key - a palette key
 * @returns its colour, or null for a key the cover palette doesn't have
 */
function previewColourOf(key: string): string | null {
  const known = Object.keys(coverPalette).find((name) => name === key);
  if (known === undefined) return null;
  return coverPalette[known as CoverColourKey];
}

/**
 * Renders the drop-down, its preview and the hint.
 *
 * @returns the field
 */
export function CardColourField({ value, onChange }: CardColourFieldProps) {
  const { t } = useTranslation('writing');
  // Step 1: our default first, then the palette in the board's order, by name.
  const options = [
    { value: ourDefault, label: t('cardColour.ourDefault') },
    ...cardColourKeys.map((key) => ({ value: key, label: t(`cover.colourNames.${key}`) })),
  ];
  const preview = value === null ? null : previewColourOf(value);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          id="story-card-colour"
          label={t('cardColour.label')}
          isLabelVisible
          options={options}
          value={value ?? ourDefault}
          // Step 2: "our default" is stored as null, so the database default can change later.
          onChange={(chosen) => onChange(chosen === ourDefault ? null : chosen)}
          descriptionId="story-card-colour-hint"
        />
        {preview !== null && (
          <span
            aria-hidden="true"
            className="inline-block size-8 rounded-full border border-[rgba(38,20,46,0.14)]"
            style={{ backgroundColor: preview }}
          />
        )}
      </div>
      <p id="story-card-colour-hint" className="m-0 text-sm text-body">
        {t('cardColour.hint')}
      </p>
    </div>
  );
}
