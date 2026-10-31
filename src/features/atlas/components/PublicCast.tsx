/**
 * PublicCast: the characters a writer shares, grouped by role (story S1-E17-33).
 *
 * Each character is a link to their public page, with their picture (only once it passed its
 * check, rule 19) or initials. Who uses it: PublicPlanView. What it calls: lib/castGroups.ts,
 * CharacterAvatar and PlanGuardPill (the preview's marks).
 */
import { Link } from 'react-router';

import type { PublicPlan } from '../api/publicPlan';
import { groupCast } from '../lib/castGroups';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterAvatar } from './CharacterAvatar';
import { PlanGuardPill } from './PlanGuardPill';

/**
 * Renders the groups.
 *
 * @param props.plan - the public plan
 * @param props.base - the base address of the readers' (or the preview's) pages
 * @returns one section per role, or a plain line when nobody is shown
 */
export function PublicCast({ plan, base }: { plan: PublicPlan; base: string }) {
  const { t } = useAtlasTranslation();
  const groups = groupCast(plan.cast.characters, '');
  if (groups.length === 0) return <p className="m-0 text-body">{t('publicPlan.cast.none')}</p>;
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section
          key={group.role}
          aria-labelledby={`atlas-public-role-${group.role}`}
          className="flex flex-col gap-3"
        >
          <h2
            id={`atlas-public-role-${group.role}`}
            className="m-0 font-heading text-[22px] font-bold text-heading"
          >
            {t(`characters.role.${group.role}`)}
          </h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {group.characters.map((character) => (
              <li key={character.id} className="flex flex-col gap-2">
                <Link
                  to={`${base}/characters/${character.id}`}
                  className="flex min-h-14 items-center gap-3 rounded-card border border-border bg-surface px-4 py-3 font-semibold break-words text-heading no-underline shadow-card hover:bg-tint"
                >
                  <CharacterAvatar character={character} size="small" />
                  <span className="min-w-0">{character.name}</span>
                </Link>
                <PlanGuardPill guard={plan.characterGuards[character.id]} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
