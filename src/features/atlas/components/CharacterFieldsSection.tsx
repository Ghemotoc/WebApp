/**
 * CharacterFieldsSection: "Your character fields" on the at-a-glance page (story S1-E17-10: "when
 * I define a custom field once, then it appears on every character's sheet in that story";
 * "when I remove it, then it is hidden but the values already written are kept, and bringing it
 * back shows them again").
 *
 * The fields with Remove or Bring back, then a box and "Add field", flat under a fine line as board
 * E21 draws it (user stories bundle 6). A plain message says when a change didn't save. Who uses it: AtAGlance. What it calls: useStoryCast's addField and
 * changeField.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { CharacterField } from '../api/characters';
import { useStoryCast } from '../hooks/useStoryCast';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { AtlasFlatSection } from './AtlasFlatSection';

/** One field's row: its name, and Remove or Bring back. */
function FieldRow({ field, onToggle }: { field: CharacterField; onToggle: () => void }) {
  const { t } = useAtlasTranslation();
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="min-w-0 type-body font-semibold break-words text-ink-heading">
        {field.name}
        {field.isHidden && (
          <span className="block type-meta font-normal">{t('fieldsSection.removedNote')}</span>
        )}
      </span>
      <Button variant="text" onClick={onToggle}>
        {field.isHidden ? t('fieldsSection.restore') : t('fieldsSection.remove')}
        <span className="sr-only"> {field.name}</span>
      </Button>
    </li>
  );
}

/**
 * Renders the section.
 *
 * @param props.slug - the story's address
 * @returns the flat section with the fields and the add box
 */
export function CharacterFieldsSection({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  const { cast, addField, changeField } = useStoryCast(slug);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fields = cast?.fields ?? [];

  /** Adds the typed field, or says why not. */
  async function add() {
    setMessage(null);
    if (newName.trim() === '') return setMessage(t('fieldsSection.nameRequired'));
    await addField(newName)
      .then(() => setNewName(''))
      .catch(() => setMessage(t('fieldsSection.failed')));
  }

  /** Removes or brings back one field. */
  function toggle(field: CharacterField) {
    setMessage(null);
    void changeField(field.id, { is_hidden: !field.isHidden }).catch(() =>
      setMessage(t('fieldsSection.failed')),
    );
  }

  return (
    <AtlasFlatSection headingId="atlas-fields-heading" heading={t('fieldsSection.heading')}>
      <p className="m-0 type-meta">{t('fieldsSection.hint')}</p>
      {fields.length === 0 && (
        <p className="m-0 type-body text-ink-muted">{t('fieldsSection.none')}</p>
      )}
      {fields.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {fields.map((field) => (
            <FieldRow key={field.id} field={field} onToggle={() => toggle(field)} />
          ))}
        </ul>
      )}
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        {/* The label is for screen readers; the box says "New field" until the writer types. */}
        <label htmlFor="atlas-new-field" className="sr-only">
          {t('fieldsSection.name')}
        </label>
        <input
          id="atlas-new-field"
          type="text"
          maxLength={60}
          placeholder={t('fieldsSection.name')}
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          className="field-box h-11 min-w-0 flex-1 px-4 font-body type-body"
        />
        <Button type="submit" variant="secondary">
          {t('fieldsSection.add')}
        </Button>
      </form>
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </AtlasFlatSection>
  );
}
