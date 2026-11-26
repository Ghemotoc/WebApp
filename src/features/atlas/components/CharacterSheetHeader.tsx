/**
 * CharacterSheetHeader: the top of a character's sheet (bundle G10 ATLAS, part a; user stories
 * bundle 6, story 6.4, board E23).
 *
 * The name as the heading, then a meta line: the role in bold, the chapters told from the
 * character's point of view ("point of view in 10 chapters", bundle GAPS-1) and the first
 * appearance ("first appears in chapter 1"). Under it the face (a circle of initials until a drawn
 * picture passes the check, story 6.3) beside "Choose a picture" and its line. Flat on the page,
 * as the board draws it: no card.
 * Who uses it: CharacterSheet. What it calls: MetaLine, useCharacterAppearances (for the point of
 * view count), CharacterFace and CharacterPictureSection.
 */
import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';

import type { CharacterChange, StoryCast, StoryCharacter } from '../api/characters';
import { useCharacterAppearances } from '../hooks/useCharacterAppearances';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterFace } from './CharacterFace';
import { CharacterPictureSection } from './CharacterPictureSection';

/** What the header needs. */
export interface CharacterSheetHeaderProps {
  cast: StoryCast;
  character: StoryCharacter;
  saveChange: (change: CharacterChange) => Promise<void>;
  uploadPicture: (file: File) => Promise<string>;
  removePicture: () => Promise<void>;
}

/**
 * The meta line's facts: the role, then the point of view count and the first appearance when
 * there are any.
 */
function useHeaderFacts({
  cast,
  character,
}: Pick<CharacterSheetHeaderProps, 'cast' | 'character'>) {
  const { t } = useAtlasTranslation();
  const { appearances } = useCharacterAppearances(character.id);
  // Step 1: the role always leads, in bold.
  const facts: MetaFact[] = [{ text: t(`characters.role.${character.role}`), kind: 'state' }];
  // Step 2: how many chapters the character tells, once there is at least one.
  const pointOfViewCount = (appearances ?? []).filter((appearance) => appearance.isPov).length;
  if (pointOfViewCount > 0) {
    facts.push({ text: t('characters.povFact', { count: pointOfViewCount }) });
  }
  // Step 3: the chapter the character first appears in, once the writer picked one.
  const firstChapter = cast.chapters.find((chapter) => chapter.code === character.firstAppearance);
  if (firstChapter !== undefined) {
    facts.push({ text: t('characters.firstAppearsFact', { number: firstChapter.position }) });
  }
  return facts;
}

/**
 * Renders the header.
 *
 * @returns the name, the meta line, the face and the picture's controls
 */
export function CharacterSheetHeader(props: CharacterSheetHeaderProps) {
  const { cast, character, saveChange } = props;
  const facts = useHeaderFacts({ cast, character });
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="atlas-character-heading" className="m-0 type-title wrap-anywhere text-ink-heading">
          {character.name}
        </h2>
        <MetaLine facts={facts} />
      </div>
      <div className="flex min-w-0 items-start gap-4">
        <CharacterFace
          id={character.id}
          name={character.name}
          character={character}
          size="large"
          alt={character.pictureAlt}
        />
        <CharacterPictureSection
          character={character}
          upload={props.uploadPicture}
          remove={props.removePicture}
          saveAlt={async (alt) => saveChange({ picture_alt: alt })}
        />
      </div>
    </div>
  );
}
