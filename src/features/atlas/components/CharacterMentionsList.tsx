/**
 * CharacterMentionsList: "Mentioned in" on a character sheet (story S1-E17-12: "Given bible
 * entries, chapters, ideas or other sheets that link to the character with [[their name]] or an
 * alias, when I view the sheet, then 'Mentioned in' lists them"; "when I choose an item, then it
 * opens with one click").
 *
 * Each place is a link to it, with what kind of place it is in words. Since CALM-9 (board E23) it
 * is its own folding card in the sheet's side column, with the number of places as its hint.
 * Who uses it: CharacterSheet. What it calls: useCharacterMentions → character_mentions(),
 * lib/itemAddress.ts and FoldingCard.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import { useCharacterMentions } from '../hooks/useCharacterMentions';
import { itemAddress } from '../lib/itemAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { FoldingCard } from './FoldingCard';

/**
 * Renders the list.
 *
 * @param props.slug - the story's address, for the links
 * @param props.characterId - the character's ID
 * @returns the folding card with the list, a note when there is nothing yet, or a plain message
 */
export function CharacterMentionsList({
  slug,
  characterId,
}: {
  slug: string;
  characterId: string;
}) {
  const { t } = useAtlasTranslation();
  const { mentions, loadFailed } = useCharacterMentions(characterId);
  // Its own folded card in the side column, with the count beside the title (CALM-9, board E23:
  // "Mentioned in [N] places").
  const hint = mentions ? t('characters.foldHints.places', { count: mentions.length }) : undefined;
  return (
    <FoldingCard title={t('links.mentionedIn.heading')} hint={hint} contentClassName="gap-2">
      {loadFailed && <Notice tone="error">{t('links.mentionedIn.loadFailed')}</Notice>}
      {mentions?.length === 0 && (
        <p className="m-0 text-sm text-meta">{t('links.mentionedIn.none')}</p>
      )}
      {mentions !== undefined && mentions.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0" data-testid="atlas-mentions">
          {mentions.map((mention) => (
            <li
              key={`${mention.kind}-${mention.ref}`}
              className="flex flex-wrap items-baseline gap-x-2"
            >
              <Link
                to={itemAddress(slug, mention)}
                className="inline-flex min-h-11 items-center font-semibold break-words"
              >
                {mention.title.trim() === '' ? t('chapterPlan.untitled') : mention.title}
              </Link>
              <span className="text-sm text-meta">
                {t(`links.mentionedIn.kinds.${mention.kind}`)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </FoldingCard>
  );
}
