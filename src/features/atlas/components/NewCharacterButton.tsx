/**
 * NewCharacterButton: "New character", a quiet button with the person-and-plus icon (story
 * S1-E17-08; drawn in bundle CALM-9a, boards D01 and E21), with a plain message when the character
 * couldn't be made.
 *
 * In the Atlas top bar the words fold away after the writer's first three visits (design books
 * item 18): the icon stays, and the words stay its accessible name.
 * Who uses it: CastToolbar (on the Characters page) and AtlasTopBar (the top row of every other
 * Atlas page, through AtlasNewCharacter). What it calls: the create function it is given.
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
 * @param props.isFolded - true shows the icon only, a 44 px square (design books item 18)
 * @returns the button with a polite live area for the error
 */
export function NewCharacterButton({
  onCreate,
  isFolded = false,
}: {
  onCreate: () => Promise<void>;
  isFolded?: boolean;
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
        variant="secondary"
        disabled={isCreating}
        onClick={() => void create()}
        className={isFolded ? 'w-11 px-0' : undefined}
      >
        <ActionIcon name="personPlus" />
        {/* Folded, the words stay as the button's name for screen readers. */}
        <span className={isFolded ? 'sr-only' : undefined}>{t('characters.newCharacter')}</span>
      </Button>
      <div aria-live="polite">
        {failed && <Notice tone="error">{t('characters.createFailed')}</Notice>}
      </div>
    </div>
  );
}
