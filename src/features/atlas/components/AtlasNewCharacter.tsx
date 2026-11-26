/**
 * AtlasNewCharacter: "New character" in the top row of an Atlas page (bundle CALM-9a; Robert,
 * 22 Nov 2026: "it's harder to find ... add characters"). It makes a character with the default
 * name and opens its sheet on the Characters page, as the Characters page's own button does.
 *
 * Who uses it: AtlasTopBar. What it calls: useStoryCast (the same cached cast the Characters page
 * reads, so it adds no load of its own once that page has opened) and NewCharacterButton.
 */
import { useNavigate } from 'react-router';

import { useStoryCast } from '../hooks/useStoryCast';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { NewCharacterButton } from './NewCharacterButton';

/**
 * Renders the button for one story.
 *
 * @param props.slug - the story open now
 * @param props.isMain - true where it is the page's main action (At a glance, board E21)
 * @param props.isCompact - true to show the icon alone (after the first visits, story 6.2)
 * @returns NewCharacterButton wired to this story
 */
export function AtlasNewCharacter({
  slug,
  isMain = false,
  isCompact = false,
}: {
  slug: string;
  isMain?: boolean;
  isCompact?: boolean;
}) {
  const { t } = useAtlasTranslation();
  const navigate = useNavigate();
  const { create } = useStoryCast(slug);

  /** Makes the character, then opens its sheet; a failure is shown by the button. */
  async function createAndOpen() {
    const characterId = await create(t('characters.newName'));
    await navigate(`/plan/s/${slug}/characters/${characterId}`);
  }

  return <NewCharacterButton onCreate={createAndOpen} isMain={isMain} isCompact={isCompact} />;
}
