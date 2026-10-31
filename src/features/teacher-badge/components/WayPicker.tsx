/**
 * WayPicker: "How do you want to show you teach?", the two radio cards (story S1-E2-11,
 * criterion 1; board Onboarding 2.5, step 3).
 *
 * Who shows it: TeacherBadgeForm. Real radio buttons in a fieldset, so the arrow keys move between
 * the two ways and a screen reader hears the legend first (WCAG 1.3.1, 2.1.1). The chosen card
 * gets a plum border as well as the checked radio, so colour is never the only sign.
 */
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import type { TeacherCheckWay } from '../api/teacherBadge';

/** The ways, in the board's order. */
const ways: TeacherCheckWay[] = ['school_email', 'proof'];

/** What the picker needs. */
export interface WayPickerProps {
  /** Tells the radio group apart when the form shows twice on a page. */
  idPrefix: string;
  chosen: TeacherCheckWay;
  onChoose: (way: TeacherCheckWay) => void;
}

/**
 * Renders the two cards.
 *
 * @returns the fieldset
 */
export function WayPicker({ idPrefix, chosen, onChoose }: WayPickerProps) {
  const { t } = useTranslation('account');
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-3 p-0 text-sm font-semibold text-ink">
        {t('teacherBadge.wayLegend')}
      </legend>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-3">
        {ways.map((way) => (
          <label
            key={way}
            className={cn(
              'grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 rounded-[18px] border bg-surface p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus-ring)',
              way === chosen ? 'border-2 border-primary' : 'border-border',
            )}
          >
            <input
              type="radio"
              name={`${idPrefix}-teacher-way`}
              value={way}
              checked={way === chosen}
              onChange={() => onChoose(way)}
              className="row-span-2 mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
            />
            <span className="block text-base font-bold text-ink">
              {t(`teacherBadge.ways.${way}.title`)}
            </span>
            <span className="mt-1 block text-sm leading-relaxed text-body">
              {t(`teacherBadge.ways.${way}.text`)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
