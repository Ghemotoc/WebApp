/**
 * ModeChoice: Light, Night or Match my device, as one row of segments in Settings › Appearance
 * (bundle G2 THEMES; design/boards Settings.dc.html, "Mode").
 *
 * The segments are real radio buttons (hidden) with visible labels, so arrow keys move between
 * them and a screen reader hears the group's name. The picked segment is filled and bold and has
 * a tick, so the choice never rests on colour alone (WCAG 1.4.1). Each segment is 44 px tall
 * (CLAUDE.md rule 9). The glass segmented control with its sliding bubble comes with the shared
 * components (bundle G3); until then this keeps the same choices and order.
 * Who shows it: AppearanceSettingsSection. What it calls: nothing; it reports the pick upwards.
 */
import { useTranslation } from 'react-i18next';

import { CheckIcon } from '@/components/icons/CheckIcon';
import type { ThemePreference } from '@/lib/theme';

/** The modes in the board's order. */
const modesInOrder: readonly ThemePreference[] = ['light', 'night', 'device'];

/** What the choice needs. */
export interface ModeChoiceProps {
  picked: ThemePreference;
  onPick: (mode: ThemePreference) => void;
}

/**
 * Renders the group.
 *
 * @returns the fieldset
 */
export function ModeChoice({ picked, onPick }: ModeChoiceProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-[15px] font-bold text-ink">
        {t('appearance.modeLegend')}
      </legend>
      {/* Three equal columns on a phone, so the row never wraps; their natural width from 640 px. */}
      <div className="grid grid-cols-3 gap-1 rounded-[26px] border border-control-border bg-surface p-1 sm:inline-flex sm:self-start sm:rounded-full">
        {modesInOrder.map((mode) => {
          const isPicked = mode === picked;
          const look = isPicked ? 'bg-primary font-bold text-on-primary' : 'font-medium text-ink';
          return (
            <label
              key={mode}
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-2 text-center text-sm leading-tight sm:px-5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring) ${look}`}
            >
              <input
                type="radio"
                name="appearance-mode"
                value={mode}
                checked={isPicked}
                onChange={() => onPick(mode)}
                className="sr-only"
              />
              {isPicked && <CheckIcon />}
              {t(`appearance.modes.${mode}`)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
