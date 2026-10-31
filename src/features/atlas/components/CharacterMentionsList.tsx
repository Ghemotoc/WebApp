/**
 * CharacterMentionsList: "Mentioned in" on a character sheet (story S1-E17-12: "Given bible
 * entries, chapters, ideas or other sheets that link to the character with [[their name]] or an
 * alias, when I view the sheet, then 'Mentioned in' lists them"; "when I choose an item, then it
 * opens with one click").
 *
 * Each place is a link to it, with what kind of place it is in words. Who uses it:
 * CharacterAppearancesSection. What it calls: useCharacterMentions → character_mentions() and
 * lib/itemAddress.ts.
 */
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import { useCharacterMentions } from '../hooks/useCharacterMentions';
import { itemAddress } from '../lib/itemAddress';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the list.
 *
 * @param props.slug - the story's address, for the links
 * @param props.characterId - the character's ID
 * @returns the heading and the list, a note when there is nothing yet, or a plain message
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
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('links.mentionedIn.heading')}
      </h3>
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
    </div>
  );
}
