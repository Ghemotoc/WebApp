/**
 * AvatarPartTiles: one shape part of the avatar (hairstyle, eyes, glasses and so on) as a row of
 * picture tiles, each the person's avatar with that choice (bundle AVATAR-1; Robert, 6 Nov 2026:
 * "much easier to do, not with dropdowns").
 *
 * A radiogroup named by the part; each tile is a radio button named "Hairstyle: Bob" in words,
 * so the choice never rests on the picture alone, and is 64 px square (well over the 24 px
 * minimum, CLAUDE.md rule 9). The chosen tile has a violet ring and a tick.
 * Who shows it: AvatarEditorTabs. What it calls: AvatarDrawing and the onChoose it is given.
 */
import { CheckIcon } from '@/components/icons/CheckIcon';
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { avatarChoices, type AvatarShapePart } from '../lib/avatarOptions';
import { useAvatarsTranslation } from '../registerAvatarTranslations';

import { AvatarDrawing } from './AvatarDrawing';

/** What the tiles need. */
export interface AvatarPartTilesProps {
  part: AvatarShapePart;
  draft: AvatarRecipe;
  onChoose: (part: AvatarShapePart, value: string) => void;
}

/**
 * Renders the part's heading and its tiles.
 *
 * @returns the group
 */
export function AvatarPartTiles({ part, draft, onChoose }: AvatarPartTilesProps) {
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
        {avatarChoices[part].map((value) => {
          const isChosen = draft[part] === value;
          const choiceName = t(`${part}.${value}`);
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isChosen}
              aria-label={t('builder.choice', { part: partName, choice: choiceName })}
              title={choiceName}
              onClick={() => onChoose(part, value)}
              className={`relative inline-flex size-16 items-center justify-center rounded-2xl border bg-panel p-1 ${
                isChosen
                  ? 'border-link ring-2 ring-link ring-offset-2 ring-offset-surface'
                  : 'border-border hover:border-control-border'
              }`}
            >
              {/* The tile is the person's own avatar with this one choice changed. */}
              <AvatarDrawing recipe={{ ...draft, [part]: value }} className="size-full" />
              {isChosen && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-link text-white">
                  <CheckIcon size={12} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
