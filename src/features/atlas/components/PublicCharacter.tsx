/**
 * PublicCharacter: one character's public page (story S1-E17-33).
 *
 * The name, role and picture, then the parts of the sheet the writer opened as label rows (DoD:
 * a fine line between rows), the writer's own fields they opened, the first appearance (a link
 * to that chapter) and how the character is connected to the others readers can see. Read-only,
 * with the shared Report button (rule 6; S1-E17-34), which the writer's preview leaves out.
 * Who uses it: PublicPlanView. What it calls: CharacterAvatar, LabelRows, ReportButton and
 * useRelationshipWords.
 */
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { LabelRows, type LabelRow } from '@/components/ui/LabelRows';
import { ReportButton } from '@/features/reporting/components/ReportButton';

import { sheetGroups, type StoryCharacter } from '../api/characters';
import type { PublicPlan } from '../api/publicPlan';
import { useRelationshipWords } from '../hooks/useRelationshipWords';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterAvatar } from './CharacterAvatar';
import { PlanGuardPill } from './PlanGuardPill';

/** What the page needs. */
export interface PublicCharacterProps {
  plan: PublicPlan;
  character: StoryCharacter;
  base: string;
  isPreview: boolean;
}

/** The sheet's open fields, the writer's open fields and the first appearance, as rows. */
function useSheetRows(plan: PublicPlan, character: StoryCharacter): LabelRow[] {
  const { t } = useAtlasTranslation();
  // Step 1: the sheet's text fields, in the sheet's order, where the writer wrote something.
  const keys = Object.values(sheetGroups).flat();
  const rows: LabelRow[] = keys
    .filter((key) => (character.sheet[key] ?? '') !== '')
    .map((key) => ({
      label: t(`characters.fields.${key}`),
      value: <span className="whitespace-pre-line">{character.sheet[key]}</span>,
    }));
  // Step 2: the writer's own fields the database let through.
  for (const field of plan.cast.fields) {
    const value = character.customValues[field.id] ?? '';
    if (value !== '') {
      rows.push({ label: field.name, value: <span className="whitespace-pre-line">{value}</span> });
    }
  }
  // Step 3: the first appearance, as a link to that chapter.
  const chapter = plan.chapters.find((candidate) => candidate.code === character.firstAppearance);
  if (chapter !== undefined) {
    rows.push({
      label: t('characters.firstAppearance'),
      value: (
        <Link to={`/s/${plan.storySlug}/${chapter.code}`} className="text-link underline">
          {chapter.title}
        </Link>
      ),
    });
  }
  return rows;
}

/** The character's relationships to the others readers see, as sentences. */
function CharacterLinks({ plan, characterId }: { plan: PublicPlan; characterId: string }) {
  const { t } = useAtlasTranslation();
  const words = useRelationshipWords(plan.cast);
  const own = plan.cast.relationships.filter(
    (relationship) => relationship.fromId === characterId || relationship.toId === characterId,
  );
  if (own.length === 0) return null;
  return (
    <section aria-labelledby="atlas-public-links-heading" className="flex flex-col gap-2">
      <h3
        id="atlas-public-links-heading"
        className="m-0 font-heading text-lg font-bold text-heading"
      >
        {t('publicPlan.character.connections')}
      </h3>
      <ul className="m-0 list-none p-0">
        {own.map((relationship) => (
          <li key={relationship.id} className="border-b border-hairline py-2 last:border-b-0">
            {words.sentence(relationship, characterId)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the character's article
 */
export function PublicCharacter({ plan, character, base, isPreview }: PublicCharacterProps) {
  const { t } = useAtlasTranslation();
  const rows = useSheetRows(plan, character);
  return (
    <article
      aria-labelledby="atlas-public-character-heading"
      className="flex min-w-0 flex-col gap-5 rounded-card border border-border bg-surface px-5 py-6 shadow-card md:px-7"
    >
      <Link to={`${base}/characters`} className="self-start text-sm font-semibold text-link">
        {t('publicPlan.character.back')}
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <CharacterAvatar character={character} size="large" />
        <div className="flex min-w-0 flex-col gap-2">
          <h2
            id="atlas-public-character-heading"
            className="m-0 font-heading text-[clamp(28px,3vw,40px)] leading-[1.05] font-extrabold break-words text-heading"
          >
            {character.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            <InfoPill tone="plum">{t(`characters.role.${character.role}`)}</InfoPill>
            <PlanGuardPill guard={plan.characterGuards[character.id]} />
          </div>
        </div>
      </div>
      {rows.length > 0 && <LabelRows rows={rows} />}
      <CharacterLinks plan={plan} characterId={character.id} />
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
