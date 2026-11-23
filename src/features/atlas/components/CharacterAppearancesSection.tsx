/**
 * CharacterAppearancesSection: "Appears in" on a character sheet (story S1-E17-12: "given chapters
 * where the character is the POV or marked present, when I view the sheet, then 'Appears in'
 * lists them"; "when I choose an item, then it opens with one click").
 *
 * Each chapter is a link to its editor, with whether the character is the point of view, present
 * or both. The card folds shut with the number of chapters beside its title; "Mentioned in" is
 * its own card since CALM-9 (board E23).
 * Who uses it: CharacterSheet. What it calls: useCharacterAppearances → character_appearances()
 * and FoldingCard.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import type { CharacterAppearance } from '../api/chapterPlans';
import { useCharacterAppearances } from '../hooks/useCharacterAppearances';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { FoldingCard } from './FoldingCard';

/** The words for how the character is in one chapter. */
function roleKey(appearance: CharacterAppearance): string {
  if (appearance.isPov && appearance.isPresent) return 'chapterPlan.appearsIn.povAndPresent';
  if (appearance.isPov) return 'chapterPlan.appearsIn.pov';
  return 'chapterPlan.appearsIn.present';
}

/**
 * Renders the section.
 *
 * @param props.slug - the story's address, for the chapter links
 * @param props.characterId - the character's ID
 * @returns the card with both lists, a note when there is nothing yet, or a plain message
 */
export function CharacterAppearancesSection({
  slug,
  characterId,
}: {
  slug: string;
  characterId: string;
}) {
  const { t } = useAtlasTranslation();
  const { appearances, loadFailed } = useCharacterAppearances(characterId);
  // The hint counts the chapters once they have loaded (CALM-9, board E23: "[N] chapters").
  const hint = appearances
    ? t('characters.foldHints.chapters', { count: appearances.length })
    : undefined;
  return (
    <FoldingCard title={t('chapterPlan.appearsIn.heading')} hint={hint} contentClassName="gap-3">
      {loadFailed && <Notice tone="error">{t('chapterPlan.appearsIn.loadFailed')}</Notice>}
      {appearances?.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('chapterPlan.appearsIn.none')}</p>
      )}
      {appearances !== undefined && appearances !== null && appearances.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {appearances.map((appearance) => (
            <li key={appearance.code} className="flex flex-wrap items-baseline gap-x-2">
              <Link
                to={`/write/s/${slug}/c/${appearance.code}`}
                className="inline-flex min-h-11 items-center font-semibold"
              >
                {t('chapterPlan.appearsIn.chapter', {
                  number: appearance.position,
                  title: appearance.title === '' ? t('chapterPlan.untitled') : appearance.title,
                })}
              </Link>
              <span className="type-body text-ink-muted">{t(roleKey(appearance))}</span>
            </li>
          ))}
        </ul>
      )}
    </FoldingCard>
  );
}
