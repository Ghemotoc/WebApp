/**
 * PublicCast: the characters a writer shares (story S1-E17-33; bundle G10 ATLAS, part c4, board
 * AtlasPreview: one grid of centred glass cards).
 *
 * Each card is a link to the character's public page: the picture (only once it passed its
 * check, rule 19; no initials circle without one, G10a), the name and one quiet line of at most
 * two lines (what they do, when the writer opened that field, otherwise their role). A name
 * without spaces breaks inside its card. The cards keep the cast's order: main characters first.
 * Who uses it: PublicPlanView. What it calls: lib/castGroups.ts, CharacterAvatar and
 * PlanGuardPill (the preview's marks).
 */
import { Link } from 'react-router';

import type { PublicPlan } from '../api/publicPlan';
import { groupCast } from '../lib/castGroups';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterAvatar } from './CharacterAvatar';
import { PlanGuardPill } from './PlanGuardPill';

/**
 * Renders the grid.
 *
 * @param props.plan - the public plan
 * @param props.base - the base address of the readers' (or the preview's) pages
 * @returns the cards, or a plain line when nobody is shown
 */
export function PublicCast({ plan, base }: { plan: PublicPlan; base: string }) {
  const { t } = useAtlasTranslation();
  // The role groups, flattened: main characters first, each group in name order.
  const characters = groupCast(plan.cast.characters, '').flatMap((group) => group.characters);
  if (characters.length === 0) return <p className="m-0 text-body">{t('publicPlan.cast.none')}</p>;
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {characters.map((character) => (
        <li key={character.id} className="flex min-w-0 flex-col items-center gap-2">
          <Link
            to={`${base}/characters/${character.id}`}
            className="flex h-full w-full min-w-0 flex-col items-center gap-2.5 rounded-card border border-border bg-surface px-5 py-6 text-center no-underline shadow-card hover:bg-tint"
          >
            <CharacterAvatar character={character} size="small" />
            {/* max-w-full: in a centred column a long word only breaks once its box is bounded. */}
            <b
              className="max-w-full font-heading text-lg break-words text-heading"
              data-testid="atlas-public-character-name"
            >
              {character.name}
            </b>
            {/* One quiet line: a long answer stops at two lines, the full text is on the page. */}
            <span className="line-clamp-2 max-w-full text-sm break-words text-meta">
              {(character.sheet.occupation ?? '') !== ''
                ? character.sheet.occupation
                : t(`characters.role.${character.role}`)}
            </span>
          </Link>
          <PlanGuardPill guard={plan.characterGuards[character.id]} />
        </li>
      ))}
    </ul>
  );
}
