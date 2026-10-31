/**
 * CharacterAppearancesSection: "Appears in" on a character sheet (story S1-E17-12: "given chapters
 * where the character is the POV or marked present, when I view the sheet, then 'Appears in'
 * lists them"; "when I choose an item, then it opens with one click").
 *
 * Each chapter is a link to its editor, with whether the character is the point of view, present
 * or both. Under it, "Mentioned in": the places that link to the character with [[their name]]
 * or an alias (S1-E17-31).
 * Who uses it: CharacterSheet. What it calls: useCharacterAppearances → character_appearances()
 * and CharacterMentionsList.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import type { CharacterAppearance } from '../api/chapterPlans';
import { useCharacterAppearances } from '../hooks/useCharacterAppearances';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterMentionsList } from './CharacterMentionsList';

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
  return (
    <section
      aria-labelledby="atlas-appears-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2
        id="atlas-appears-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('chapterPlan.appearsIn.heading')}
      </h2>
      {loadFailed && <Notice tone="error">{t('chapterPlan.appearsIn.loadFailed')}</Notice>}
      {appearances?.length === 0 && (
        <p className="m-0 text-sm text-meta">{t('chapterPlan.appearsIn.none')}</p>
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
              <span className="text-sm text-meta">{t(roleKey(appearance))}</span>
            </li>
          ))}
        </ul>
      )}
      <CharacterMentionsList slug={slug} characterId={characterId} />
    </section>
  );
}
