/**
 * CharacterSheet: one character's sheet on the Characters page (stories S1-E17-09 to S1-E17-11,
 * S1-E17-13 and S1-E17-14).
 *
 * From top to bottom: the name as the heading, the name and role, the picture, then the four
 * groups (Basics, Look and voice, Inside, In the story with the first appearance), the writer's
 * own fields, the character's relationships (S1-E17-14), what readers see of them (S1-E17-32)
 * and Delete. Every field saves by itself.
 * The caller gives it a key per character, so switching characters saves what was waiting and
 * starts the next sheet fresh.
 * Who uses it: CharactersPage. What it calls: useStoryCast's changers (through the props) and the
 * sheet's section components.
 */
import type { CharacterChange, SheetKey, StoryCast, StoryCharacter } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterIdentityFields } from './CharacterIdentityFields';
import { CharacterAppearancesSection } from './CharacterAppearancesSection';
import { CharacterPictureSection } from './CharacterPictureSection';
import { CharacterRelationshipsSection } from './CharacterRelationshipsSection';
import { CustomValuesSection } from './CustomValuesSection';
import { DeleteCharacterSection } from './DeleteCharacterSection';
import { PlanSelectField } from './PlanSelectField';
import { ReaderVisibilitySection } from './ReaderVisibilitySection';
import { SheetGroupSection } from './SheetGroupSection';

/** What the sheet needs. */
export interface CharacterSheetProps {
  slug: string;
  cast: StoryCast;
  character: StoryCharacter;
  saveChange: (change: CharacterChange) => Promise<void>;
  uploadPicture: (file: File) => Promise<string>;
  removePicture: () => Promise<void>;
  onDelete: () => Promise<void>;
}

/** "First appearance, picked from the chapters" (S1-E17-09). */
function FirstAppearanceField({
  cast,
  character,
  saveChange,
}: Pick<CharacterSheetProps, 'cast' | 'character' | 'saveChange'>) {
  const { t } = useAtlasTranslation();
  const options = [
    { value: '', label: t('characters.firstAppearanceNone') },
    ...cast.chapters.map((chapter) => ({
      value: chapter.code,
      label:
        chapter.title.trim() === ''
          ? t('chapters.chapterUntitled', { number: chapter.position })
          : t('chapters.chapterTitle', { number: chapter.position, title: chapter.title }),
    })),
  ];
  return (
    <PlanSelectField
      id="atlas-character-first-appearance"
      label={t('characters.firstAppearance')}
      options={options}
      savedValue={character.firstAppearance ?? ''}
      save={async (code) => saveChange({ first_appearance: code })}
    />
  );
}

/**
 * Renders the sheet.
 *
 * @returns the heading and the sheet's sections
 */
export function CharacterSheet(props: CharacterSheetProps) {
  const { slug, cast, character, saveChange } = props;
  /** Saves one sheet field by itself. */
  const saveSheetField = async (key: SheetKey, value: string) =>
    saveChange({ sheet: { [key]: value } });
  return (
    <article aria-labelledby="atlas-character-heading" className="flex min-w-0 flex-col gap-6">
      <h2
        id="atlas-character-heading"
        className="m-0 font-heading text-[clamp(28px,3vw,40px)] leading-[1.05] font-extrabold break-words text-heading"
      >
        {character.name}
      </h2>
      <CharacterIdentityFields character={character} saveChange={saveChange} />
      <CharacterPictureSection
        character={character}
        upload={props.uploadPicture}
        remove={props.removePicture}
        saveAlt={async (alt) => saveChange({ picture_alt: alt })}
      />
      <SheetGroupSection group="basics" character={character} saveSheetField={saveSheetField} />
      <SheetGroupSection
        group="lookAndVoice"
        character={character}
        saveSheetField={saveSheetField}
      />
      <SheetGroupSection group="inside" character={character} saveSheetField={saveSheetField} />
      <SheetGroupSection group="inTheStory" character={character} saveSheetField={saveSheetField}>
        <FirstAppearanceField cast={cast} character={character} saveChange={saveChange} />
      </SheetGroupSection>
      <CustomValuesSection
        slug={slug}
        character={character}
        fields={cast.fields}
        saveValue={async (fieldId, value) => saveChange({ custom: { [fieldId]: value } })}
      />
      <CharacterAppearancesSection slug={slug} characterId={character.id} />
      <CharacterRelationshipsSection slug={slug} cast={cast} characterId={character.id} />
      <ReaderVisibilitySection
        slug={slug}
        characterId={character.id}
        name={character.name}
        fields={cast.fields}
      />
      <DeleteCharacterSection name={character.name} onDelete={props.onDelete} />
    </article>
  );
}
