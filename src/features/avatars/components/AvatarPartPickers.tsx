/**
 * AvatarPartPickers: one labelled drop-down per part of the avatar (bundle ADMIN-2, part g; brief
 * section 7: "Every control is labelled and works by keyboard ... no free text").
 *
 * Native drop-downs: every choice is named in words (colours by name, never by colour alone), and
 * the keyboard works as in any form.
 * Who shows it: AvatarBuilderSection. What it calls: the onChoose it is given.
 */
import { useAvatarsTranslation } from '../registerAvatarTranslations';

import { Select } from '@/components/ui/Select';
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { avatarChoices, avatarParts, type AvatarPart } from '../lib/avatarOptions';

/** What the pickers need. */
export interface AvatarPartPickersProps {
  draft: AvatarRecipe;
  onChoose: (part: AvatarPart, value: string) => void;
}

/**
 * Renders the drop-downs.
 *
 * @returns the group of drop-downs
 */
export function AvatarPartPickers({ draft, onChoose }: AvatarPartPickersProps) {
  const { t } = useAvatarsTranslation();
  return (
    <fieldset className="m-0 flex flex-wrap gap-x-6 gap-y-4 border-0 p-0">
      <legend className="sr-only">{t('builder.partsLegend')}</legend>
      {avatarParts.map((part) => (
        <div key={part} className="flex flex-col gap-1">
          <Select
            id={`avatar-${part}`}
            label={t(`parts.${part}`)}
            isLabelVisible
            value={draft[part]}
            options={avatarChoices[part].map((value) => ({
              value,
              label: t(`${part}.${value}`),
            }))}
            onChange={(value) => onChoose(part, value)}
          />
        </div>
      ))}
    </fieldset>
  );
}
