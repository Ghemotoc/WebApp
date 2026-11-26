/**
 * PublicCast: the characters a writer shares (story S1-E17-33; redrawn as board E35 in user
 * stories bundle 6, story 6.16).
 *
 * "Only what the writer shares, and only up to the chapter you've reached.", then three columns
 * of cards. Each card is a link to the character's public page: the face (the picture once it
 * passed its check, rule 19, else the initials circle), the name in bold and one quiet line (the
 * writer's one-line summary, else what they do, else their role). A name without spaces breaks
 * inside its card. The cards keep the cast's order: main characters first.
 * Who uses it: PublicPlanView. What it calls: lib/castGroups.ts, CharacterFace and PlanGuardPill
 * (the preview's marks).
 */
import { Link } from 'react-router';

import type { StoryCharacter } from '../api/characters';
import type { PublicPlan } from '../api/publicPlan';
import { groupCast } from '../lib/castGroups';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterFace } from './CharacterFace';
import { PlanGuardPill } from './PlanGuardPill';

/** A card's quiet line: the one-line summary, else what they do, else the role. */
function useCardLine(character: StoryCharacter): string {
  const { t } = useAtlasTranslation();
  const summary = (character.sheet.summary ?? '').trim();
  if (summary !== '') return summary;
  const occupation = (character.sheet.occupation ?? '').trim();
  if (occupation !== '') return occupation;
  return t(`characters.role.${character.role}`);
}

/** One card: the face, the name and the line, the whole card a link to the character. */
function CastCard({
  plan,
  base,
  character,
}: {
  plan: PublicPlan;
  base: string;
  character: StoryCharacter;
}) {
  const line = useCardLine(character);
  return (
    <li className="flex min-w-0 flex-col gap-2">
      <Link
        to={`${base}/characters/${character.id}`}
        className="flex h-full min-w-0 items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 text-ink no-underline hover:bg-tint"
      >
        <CharacterFace id={character.id} name={character.name} character={character} />
        <span className="flex min-w-0 flex-col">
          <b
            className="type-label font-semibold break-words text-ink-heading"
            data-testid="atlas-public-character-name"
          >
            {character.name}
          </b>
          <span className="type-meta break-words text-ink-muted">{line}</span>
        </span>
      </Link>
      <PlanGuardPill guard={plan.itemGuards[character.id]} />
    </li>
  );
}

/**
 * Renders the lead line and the cards.
 *
 * @param props.plan - the public plan
 * @param props.base - the base address of the readers' (or the preview's) pages
 * @returns the cards, or a plain line when nobody is shown
 */
export function PublicCast({ plan, base }: { plan: PublicPlan; base: string }) {
  const { t } = useAtlasTranslation();
  // The role groups, flattened: main characters first, each group in name order.
  const characters = groupCast(plan.cast.characters, '').flatMap((group) => group.characters);
  if (characters.length === 0)
    return <p className="m-0 text-ink-muted">{t('publicPlan.cast.none')}</p>;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="m-0 type-meta text-ink-muted">{t('publicPlan.cast.lead')}</p>
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <CastCard key={character.id} plan={plan} base={base} character={character} />
        ))}
      </ul>
    </div>
  );
}
