/**
 * PresentCharacterChips: "Characters present" on a chapter's plan (story S1-E17-24: "characters
 * present (toggle chips)").
 *
 * One chip per character of the story; pressing one marks the character present at once, and
 * its state shows with a tick and aria-pressed, never by colour alone (DoD pill system). A failed
 * change says so plainly. Who uses it: ChapterPlanPanel. What it calls: the setPresent prop.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Chip } from '@/components/ui/Chip';
import { Notice } from '@/components/ui/Notice';

import type { ChapterPlan } from '../api/chapterPlans';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the chips need. */
export interface PresentCharacterChipsProps {
  slug: string;
  plan: ChapterPlan;
  setPresent: (characterId: string, isPresent: boolean) => Promise<void>;
}

/**
 * Renders the group of chips, or a link to make the first character.
 *
 * @returns the labelled group
 */
export function PresentCharacterChips({ slug, plan, setPresent }: PresentCharacterChipsProps) {
  const { t } = useAtlasTranslation();
  const [failed, setFailed] = useState(false);

  /** Marks one character present or not, saying so if it didn't work. */
  function toggle(characterId: string, isPresent: boolean) {
    setFailed(false);
    void setPresent(characterId, isPresent).catch(() => setFailed(true));
  }

  return (
    <div role="group" aria-labelledby="atlas-chapter-present" className="flex flex-col gap-2">
      <p id="atlas-chapter-present" className="m-0 text-sm font-semibold text-heading">
        {t('chapterPlan.present')}
      </p>
      {plan.characters.length === 0 ? (
        <p className="m-0 text-sm text-meta">
          {t('chapterPlan.noCharacters')}{' '}
          <Link to={`/plan/s/${slug}/characters`} className="font-semibold">
            {t('chapterPlan.addCharacters')}
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {plan.characters.map((character) => (
            <Chip
              key={character.id}
              isPressed={plan.presentCharacterIds.includes(character.id)}
              onPressedChange={(isPressed) => toggle(character.id, isPressed)}
            >
              {character.name}
            </Chip>
          ))}
        </div>
      )}
      <div aria-live="polite">
        {failed && <Notice tone="error">{t('chapterPlan.presentFailed')}</Notice>}
      </div>
    </div>
  );
}
