/**
 * NewCharacterButton: "New character", a quiet button with the person-and-plus icon (story
 * S1-E17-08; drawn in bundle CALM-9a, boards D01 and E21), with a plain message when the character
 * couldn't be made.
 *
 * Who uses it: CharactersPage (under the title, as the main button) and AtlasTopBar (the top row
 * of every other Atlas page, through AtlasNewCharacter). What it calls: the create function it is given.
 */
import { useState } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the button and, after a failure, the message under it.
 *
 * @param props.onCreate - makes a character and opens its sheet; throws when it can't
 * @param props.isMain - true where it is the page's main action (At a glance's top bar, board E21)
 * @param props.isCompact - true to show the icon alone, its name kept for screen readers
 * @param props.icon - the icon beside the name: a person with a plus (board E21) or a plain plus
 *   (the Characters page, board E22)
 * @returns the button with a polite live area for the error
 */
export function NewCharacterButton({
  onCreate,
  isMain = false,
  isCompact = false,
  icon = 'personPlus',
}: {
  onCreate: () => Promise<void>;
  isMain?: boolean;
  isCompact?: boolean;
  icon?: 'personPlus' | 'plus';
}) {
  const { t } = useAtlasTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [failed, setFailed] = useState(false);

  /** Makes the character; a failure says so and lets the writer try again. */
  async function create() {
    setIsCreating(true);
    setFailed(false);
    await onCreate().catch(() => setFailed(true));
    setIsCreating(false);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant={isMain ? 'primary' : 'secondary'}
        disabled={isCreating}
        onClick={() => void create()}
        className={isCompact ? 'w-11 px-0' : undefined}
      >
        <ActionIcon name={icon} />
        {/* Folded to the icon after the first visits (story 6.2): the name stays for screen readers. */}
        <span className={isCompact ? 'sr-only' : undefined}>{t('characters.newCharacter')}</span>
      </Button>
      <div aria-live="polite">
        {failed && <Notice tone="error">{t('characters.createFailed')}</Notice>}
      </div>
    </div>
  );
}
