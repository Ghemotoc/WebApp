/**
 * ReaderVisibilitySection: "What readers see" at the foot of a character's sheet (stories
 * S1-E17-32 and S1-E17-35).
 *
 * A short line on how it works (only while Characters is public, and only once the story is
 * published), "Keep private", "Readers see it from" and the sheet's part switches, plus a link
 * to the story's "What readers can see" settings. No doodles: a working screen. The card folds
 * shut with a summary of what is shared beside its title (CALM-9, board E23).
 * Who uses it: CharacterSheet. What it calls: FoldingCard, useReaderSummary,
 * ItemVisibilityControls and SheetPartsControls.
 */
import { Link } from 'react-router';

import type { CharacterField } from '../api/characters';
import { useReaderSummary } from '../hooks/useReaderSummary';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { FoldingCard } from './FoldingCard';
import { ItemVisibilityControls } from './ItemVisibilityControls';
import { SheetPartsControls } from './SheetPartsControls';

/**
 * Renders the section.
 *
 * @param props.slug - the story's address
 * @param props.characterId - the character
 * @param props.name - the character's name, for the controls' accessible names
 * @param props.fields - the writer's own fields
 * @returns the section
 */
export function ReaderVisibilitySection({
  slug,
  characterId,
  name,
  fields,
}: {
  slug: string;
  characterId: string;
  name: string;
  fields: CharacterField[];
}) {
  const { t } = useAtlasTranslation();
  return (
    // Folds shut with a summary of what is shared beside the title (CALM-9, board E23).
    <FoldingCard
      title={t('readers.item.heading')}
      hint={useReaderSummary(slug, characterId)}
      contentClassName="gap-3"
    >
      <p className="m-0 text-sm text-body">
        {t('readers.item.characterHint')}{' '}
        <Link to={`/plan/s/${slug}/readers`} className="font-semibold text-link">
          {t('readers.item.settingsLink')}
        </Link>
      </p>
      <ItemVisibilityControls slug={slug} itemId={characterId} itemName={name} allowsGuard />
      <SheetPartsControls slug={slug} characterId={characterId} fields={fields} />
    </FoldingCard>
  );
}
