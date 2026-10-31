/**
 * CharacterFieldsSection: "Your character fields" on the at-a-glance page (story S1-E17-10: "when
 * I define a custom field once, then it appears on every character's sheet in that story";
 * "when I remove it, then it is hidden but the values already written are kept, and bringing it
 * back shows them again").
 *
 * The fields with Remove or Bring back, then a box and "Add field". A plain message says when a
 * change didn't save. Who uses it: AtAGlance. What it calls: useStoryCast's addField and
 * changeField.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { CharacterField } from '../api/characters';
import { useStoryCast } from '../hooks/useStoryCast';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** One field's row: its name, and Remove or Bring back. */
function FieldRow({ field, onToggle }: { field: CharacterField; onToggle: () => void }) {
  const { t } = useAtlasTranslation();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
      <span className="min-w-0 break-words text-body">
        {field.name}
        {field.isHidden && (
          <span className="block text-sm text-meta">{t('fieldsSection.removedNote')}</span>
        )}
      </span>
      <Button variant="secondary" onClick={onToggle}>
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
 * @returns the card with the fields and the add box
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
    <section
      aria-labelledby="atlas-fields-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2 id="atlas-fields-heading" className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('fieldsSection.heading')}
      </h2>
      <p className="m-0 text-sm text-meta">{t('fieldsSection.hint')}</p>
      {fields.length === 0 && <p className="m-0 text-body">{t('fieldsSection.none')}</p>}
      {fields.length > 0 && (
        <ul className="m-0 list-none p-0">
          {fields.map((field) => (
            <FieldRow key={field.id} field={field} onToggle={() => toggle(field)} />
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <div className="min-w-0 flex-1 basis-48">
          <TextInput
            id="atlas-new-field"
            label={t('fieldsSection.name')}
            maxLength={60}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          {t('fieldsSection.add')}
        </Button>
      </form>
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </section>
  );
}
