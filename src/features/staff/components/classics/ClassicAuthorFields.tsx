/**
 * ClassicAuthorFields: pick the work's author, or add a new one with the year they died (story
 * S1-E11-16 AC 1; Robert, 25 Oct 2026, 07:15: "pick or add the writer's name").
 *
 * Who shows it: ClassicWorkForm. What it calls: onChange; the new author is added by the form on
 * Save (admin_add_classic_author()), so nothing is saved until then.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { ClassicAuthorChoice } from '../../api/classics';

/** The author choice's value for "Add a new author". */
export const newAuthorChoice = 'new';

/** A new author, as typed. */
export interface NewAuthor {
  name: string;
  diedYear: string;
}

/** What the fields need. */
export interface ClassicAuthorFieldsProps {
  authors: ClassicAuthorChoice[];
  /** An author's id, newAuthorChoice, or '' when nothing is picked yet. */
  authorChoice: string;
  newAuthor: NewAuthor;
  onPick: (choice: string) => void;
  onNewAuthor: (newAuthor: NewAuthor) => void;
}

/**
 * Renders the picker and, for a new author, the name and year.
 *
 * @returns the author fields
 */
export function ClassicAuthorFields({
  authors,
  authorChoice,
  newAuthor,
  onPick,
  onNewAuthor,
}: ClassicAuthorFieldsProps) {
  const { t } = useTranslation('staff');
  const options = [
    { value: '', label: t('classics.form.pickAuthor') },
    ...authors.map((author) => ({
      value: author.id,
      label: t('classics.form.authorOption', { name: author.name, year: author.diedYear }),
    })),
    { value: newAuthorChoice, label: t('classics.form.newAuthor') },
  ];
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-2 font-heading text-lg font-bold text-heading">
        {t('classics.form.authorLegend')}
      </legend>
      <Select
        id="classic-author"
        label={t('classics.form.author')}
        isLabelVisible
        placement="form"
        value={authorChoice}
        onChange={onPick}
        options={options}
      />
      {authorChoice === newAuthorChoice && (
        <div className="flex flex-wrap gap-4">
          <TextInput
            id="classic-new-author-name"
            label={t('classics.form.newAuthorName')}
            value={newAuthor.name}
            maxLength={120}
            onChange={(event) => onNewAuthor({ ...newAuthor, name: event.target.value })}
          />
          <TextInput
            id="classic-new-author-died"
            label={t('classics.form.newAuthorDied')}
            inputMode="numeric"
            maxLength={4}
            value={newAuthor.diedYear}
            onChange={(event) =>
              onNewAuthor({ ...newAuthor, diedYear: event.target.value.replace(/\D/g, '') })
            }
          />
        </div>
      )}
    </fieldset>
  );
}
