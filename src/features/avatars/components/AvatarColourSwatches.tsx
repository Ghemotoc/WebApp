/**
 * AvatarColourSwatches: one colour part of the avatar (skin tone, hair colour and so on) as a
 * row of round swatches (bundle AVATAR-1; Robert, 6 Nov 2026: "not with dropdowns").
 *
 * The same pattern as the cover's colour swatches (CoverColourSwatches): a radiogroup named by
 * the part, 44 px round swatches, each named in words ("Hair colour: Auburn"), so colour is
 * never the only way to tell them apart (WCAG 2.2, 1.4.1). The chosen one has a ring and a tick
 * in whichever of dark or light text reads on it.
 * Who shows it: AvatarEditorTabs. What it calls: the onChoose it is given.
 */
import { titleColourOn } from '@/components/covers/coverDesigns';
import { CheckIcon } from '@/components/icons/CheckIcon';
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { avatarChoices, type AvatarColourPart } from '../lib/avatarOptions';
import { useAvatarsTranslation } from '../registerAvatarTranslations';

/** What the swatches need. */
export interface AvatarColourSwatchesProps {
  part: AvatarColourPart;
  draft: AvatarRecipe;
  onChoose: (part: AvatarColourPart, value: string) => void;
}

/**
 * Renders the part's heading and its swatches.
 *
 * @returns the group
 */
export function AvatarColourSwatches({ part, draft, onChoose }: AvatarColourSwatchesProps) {
  const { t } = useAvatarsTranslation();
  const partName = t(`parts.${part}`);
  return (
    <div className="flex flex-col gap-1.5">
      <span id={`avatar-part-${part}`} className="text-[13px] font-semibold text-body">
        {partName}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={`avatar-part-${part}`}
        className="flex flex-wrap gap-2"
      >
        {avatarChoices[part].map((colour) => {
          const isChosen = draft[part] === colour;
          const colourName = t(`${part}.${colour}`);
          return (
            <button
              key={colour}
              type="button"
              role="radio"
              aria-checked={isChosen}
              aria-label={t('builder.choice', { part: partName, choice: colourName })}
              title={colourName}
              onClick={() => onChoose(part, colour)}
              className={`inline-flex size-11 items-center justify-center rounded-full border border-[rgba(38,20,46,0.14)] ${
                isChosen ? 'ring-2 ring-link ring-offset-2 ring-offset-surface' : ''
              }`}
              style={{ backgroundColor: `#${colour}` }}
            >
              {isChosen && <CheckIcon size={18} style={{ color: titleColourOn(`#${colour}`) }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
