/**
 * CharacterSheetHeader: the glass card at the top of a character's sheet (bundle G10 ATLAS, part
 * a; board AtlasCharacterSheet).
 *
 * On the left the name as the heading, pills for the role, the chapters told from the character's
 * point of view ("Point of view in 6 chapters", bundle GAPS-1) and the first appearance, and the
 * character in a line; on the right the picture with its upload (CharacterPictureSection). With
 * no picture the name stands alone: no initials (handoff "Story Atlas"). On a phone the picture
 * goes under the words.
 * Who uses it: CharacterSheet. What it calls: InfoPill, useCharacterAppearances (for the point of
 * view count) and CharacterPictureSection.
 */
import { InfoPill } from '@/components/ui/InfoPill';

import type { CharacterChange, StoryCast, StoryCharacter } from '../api/characters';
import { useCharacterAppearances } from '../hooks/useCharacterAppearances';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterPictureSection } from './CharacterPictureSection';

/** What the header needs. */
export interface CharacterSheetHeaderProps {
  cast: StoryCast;
  character: StoryCharacter;
  saveChange: (change: CharacterChange) => Promise<void>;
  uploadPicture: (file: File) => Promise<string>;
  removePicture: () => Promise<void>;
}

/** "First appearance: Chapter 3", or nothing while none is picked. */
function FirstAppearancePill({
  cast,
  character,
}: Pick<CharacterSheetHeaderProps, 'cast' | 'character'>) {
  const { t } = useAtlasTranslation();
  const chapter = cast.chapters.find((candidate) => candidate.code === character.firstAppearance);
  if (chapter === undefined) return null;
  return (
    <InfoPill tone="neutral">
      {t('characters.firstAppearancePill', { number: chapter.position })}
    </InfoPill>
  );
}

/** "Point of view in 6 chapters", or nothing while the character tells none (or it is loading). */
function PointOfViewPill({ characterId }: { characterId: string }) {
  const { t } = useAtlasTranslation();
  const { appearances } = useCharacterAppearances(characterId);
  const count = (appearances ?? []).filter((appearance) => appearance.isPov).length;
  if (count === 0) return null;
  return <InfoPill tone="neutral">{t('characters.povPill', { count })}</InfoPill>;
}

/**
 * Renders the header card.
 *
 * @returns the name, pills, line and picture
 */
export function CharacterSheetHeader(props: CharacterSheetHeaderProps) {
  const { cast, character, saveChange } = props;
  const { t } = useAtlasTranslation();
  const summary = character.sheet.summary ?? '';
  return (
    <div className="flex min-w-0 flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-card md:flex-row md:p-7">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <h2
          id="atlas-character-heading"
          className="m-0 font-heading text-[clamp(28px,3vw,40px)] leading-[1.05] font-extrabold break-words text-heading"
        >
          {character.name}
        </h2>
        <div className="flex flex-wrap gap-2">
          <InfoPill tone="plum">{t(`characters.role.${character.role}`)}</InfoPill>
          <PointOfViewPill characterId={character.id} />
          <FirstAppearancePill cast={cast} character={character} />
        </div>
        {summary !== '' && <p className="m-0 text-[17px] break-words text-meta">{summary}</p>}
      </div>
      <CharacterPictureSection
        character={character}
        upload={props.uploadPicture}
        remove={props.removePicture}
        saveAlt={async (alt) => saveChange({ picture_alt: alt })}
      />
    </div>
  );
}
