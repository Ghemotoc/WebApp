/**
 * CharacterSheet: one character's sheet on the Characters page (stories S1-E17-09 to S1-E17-11,
 * S1-E17-13 and S1-E17-14; bundle G10a, board AtlasCharacterSheet).
 *
 * Two columns on a wide screen, one on a phone. The main column: the header card (the name, the
 * role and first appearance pills, the line, and the picture on the right), then the four groups
 * (Basics with the name, role and line first; Look and voice; Inside; In the story with the first
 * appearance) and the writer's own fields. The side column: the relationships (S1-E17-14), where
 * the character appears, what readers see of them (S1-E17-32) and Delete. Every field saves by
 * itself.
 * The caller gives it a key per character, so switching characters saves what was waiting and
 * starts the next sheet fresh.
 * Who uses it: CharactersPage. What it calls: useStoryCast's changers (through the props),
 * CharacterSheetHeader and the sheet's section components.
 */
import type { CharacterChange, SheetKey, StoryCast, StoryCharacter } from '../api/characters';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { CharacterIdentityFields } from './CharacterIdentityFields';
import { CharacterAppearancesSection } from './CharacterAppearancesSection';
import { CharacterRelationshipsSection } from './CharacterRelationshipsSection';
import { CharacterSheetHeader } from './CharacterSheetHeader';
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

/** The side column: relationships, appearances, what readers see and Delete. */
function SheetSideColumn({
  slug,
  cast,
  character,
  onDelete,
}: Pick<CharacterSheetProps, 'slug' | 'cast' | 'character' | 'onDelete'>) {
  const { t } = useAtlasTranslation();
  return (
    <aside aria-label={t('characters.sideColumn')} className="flex min-w-0 flex-col gap-5">
      <CharacterRelationshipsSection slug={slug} cast={cast} characterId={character.id} />
      <CharacterAppearancesSection slug={slug} characterId={character.id} />
      <ReaderVisibilitySection
        slug={slug}
        characterId={character.id}
        name={character.name}
        fields={cast.fields}
      />
      <DeleteCharacterSection name={character.name} onDelete={onDelete} />
    </aside>
  );
}

/**
 * Renders the sheet.
 *
 * @returns the header, the groups and the side column
 */
export function CharacterSheet(props: CharacterSheetProps) {
  const { slug, cast, character, saveChange } = props;
  /** Saves one sheet field by itself. */
  const saveSheetField = async (key: SheetKey, value: string) =>
    saveChange({ sheet: { [key]: value } });
  return (
    <article
      aria-labelledby="atlas-character-heading"
      className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <CharacterSheetHeader
          cast={cast}
          character={character}
          saveChange={saveChange}
          uploadPicture={props.uploadPicture}
          removePicture={props.removePicture}
        />
        <SheetGroupSection
          group="basics"
          character={character}
          saveSheetField={saveSheetField}
          before={<CharacterIdentityFields character={character} saveChange={saveChange} />}
        />
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
      </div>
      <SheetSideColumn slug={slug} cast={cast} character={character} onDelete={props.onDelete} />
    </article>
  );
}
