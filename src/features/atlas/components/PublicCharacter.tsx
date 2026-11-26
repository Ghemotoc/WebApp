/**
 * PublicCharacter: one character's public page (story S1-E17-33; user stories bundle 6, story
 * 6.18, board E37).
 *
 * The text link back to the cast, then the head (the face, the name, and one quiet line with the
 * role, the age and the pronouns when the writer opened them), then each part of the sheet the
 * writer opened (Basics as a grid of facts, the longer parts as paragraphs) and the connections
 * to the other characters readers can see, each a link to that character's page. Inside and In
 * the story stay private unless the writer opened them; the database leaves closed parts out.
 * Read-only, with the shared Report button (rule 6; S1-E17-34), which the writer's preview leaves
 * out. Who uses it: PublicPlanView. What it calls: CharacterFace, MetaLine, PublicSheetSection,
 * PublicCharacterConnections, PlanGuardPill and ReportButton.
 */
import { Link } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine } from '@/components/ui/MetaLine';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import { sheetGroups, type SheetGroup, type StoryCharacter } from '../api/characters';
import type { PublicPlan } from '../api/publicPlan';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterFace } from './CharacterFace';
import { PlanGuardPill } from './PlanGuardPill';
import { PublicCharacterConnections } from './PublicCharacterConnections';
import { PublicSheetSection, type SheetFact } from './PublicSheetSection';

/** What the page needs. */
export interface PublicCharacterProps {
  plan: PublicPlan;
  character: StoryCharacter;
  base: string;
  isPreview: boolean;
}

/** The writer's own opened fields and the first appearance, shown after Basics' own facts. */
function useExtraFacts(plan: PublicPlan, character: StoryCharacter): SheetFact[] {
  const { t } = useAtlasTranslation();
  // Step 1: the writer's own fields the database let through.
  const facts: SheetFact[] = plan.cast.fields
    .filter((field) => (character.customValues[field.id] ?? '').trim() !== '')
    .map((field) => ({
      key: field.id,
      label: field.name,
      value: character.customValues[field.id],
    }));
  // Step 2: the first appearance, as a link to that chapter.
  const chapter = plan.chapters.find((candidate) => candidate.code === character.firstAppearance);
  if (chapter !== undefined) {
    facts.push({
      key: 'first-appearance',
      label: t('characters.firstAppearance'),
      value: (
        <Link to={`/s/${plan.storySlug}/${chapter.code}`} className="text-link underline">
          {chapter.title}
        </Link>
      ),
    });
  }
  return facts;
}

/** The head: the face, the name and the quiet line under it. */
function CharacterHead({ plan, character }: { plan: PublicPlan; character: StoryCharacter }) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex min-w-0 items-center gap-4">
      <CharacterFace
        id={character.id}
        name={character.name}
        character={character}
        size="large"
        alt={character.pictureAlt}
      />
      <div className="flex min-w-0 flex-col gap-1">
        <h2
          id="atlas-public-character-heading"
          className="m-0 font-heading type-title font-bold wrap-anywhere text-ink-heading"
        >
          {character.name}
        </h2>
        <MetaLine
          facts={[
            { text: t(`characters.role.${character.role}`), kind: 'state' },
            { text: character.sheet.age_or_born ?? '' },
            { text: character.sheet.pronouns ?? '' },
          ]}
        />
        <div className="self-start empty:hidden">
          <PlanGuardPill guard={plan.itemGuards[character.id]} />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the back link and the character's article
 */
export function PublicCharacter({ plan, character, base, isPreview }: PublicCharacterProps) {
  const { t } = useAtlasTranslation();
  const extraFacts = useExtraFacts(plan, character);
  const groups = Object.keys(sheetGroups) as SheetGroup[];
  return (
    <article
      aria-labelledby="atlas-public-character-heading"
      className="flex min-w-0 flex-col gap-6"
    >
      <Link
        to={`${base}/characters`}
        className={buttonClassName({ variant: 'text' }, 'gap-2 self-start')}
      >
        <ChevronLeftIcon size={16} />
        {t('publicPlan.character.back')}
      </Link>
      <CharacterHead plan={plan} character={character} />
      {groups.map((group) => (
        <PublicSheetSection
          key={group}
          group={group}
          character={character}
          extraFacts={group === 'basics' ? extraFacts : []}
        />
      ))}
      <PublicCharacterConnections plan={plan} characterId={character.id} base={base} />
      {!isPreview && (
        <div className="self-start">
          <ReportButton
            itemType="atlas_item"
            itemReference={character.id}
            itemLabel={character.name}
          />
        </div>
      )}
    </article>
  );
}
