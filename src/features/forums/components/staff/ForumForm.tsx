/**
 * ForumForm: add or change one category, forum or subforum (bundle FORUMS-1, part a; S1-E8-01,
 * first criterion: "staff set name, description, order and parent, up to two levels deep").
 *
 * Who shows it: ForumsAdminPage (a new category) and ForumAdminRow (Change, Add a forum inside).
 * What it calls: ForumNameFields for each language, ForumPlaceFields, and the page's act().
 * The database checks everything again and sends back the fields to fix.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { ForumChanges, StaffForum } from '../../api/forumAdmin';
import type { ForumAdmin } from '../../hooks/useForumAdmin';

import { ForumNameFields } from './ForumNameFields';
import { ForumPlaceFields } from './ForumPlaceFields';

/** What the form needs. */
interface ForumFormProps {
  /** "new" for a forum being added, otherwise the forum's id. */
  formKey: string;
  initial: ForumChanges;
  forums: StaffForum[];
  admin: ForumAdmin;
  /** Closes the form; called after a save that went through, and by Cancel. */
  onClose: () => void;
}

/**
 * Renders the form.
 *
 * @returns a form with the names, the place and Save and Cancel
 */
export function ForumForm({ formKey, initial, forums, admin, onClose }: ForumFormProps) {
  const { t } = useTranslation('forumsAdmin');
  const [values, setValues] = useState(initial);
  // The database's problems for this form only: "ro:empty" → field "ro", problem "empty".
  const problems = admin.failure?.formKey === formKey ? admin.failure.error.problems : [];
  const problemOf = (field: string) => problems.find((problem) => problem.field === field)?.problem;
  // Step 1: send everything; close the form when it went through.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const isSaved = await admin.act({ kind: 'save', changes: values });
    if (isSaved) onClose();
  };
  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5"
    >
      <div className="grid gap-5 md:grid-cols-2">
        {Object.entries(values.names).map(([code, name]) => (
          <ForumNameFields
            key={code}
            formKey={formKey}
            languageCode={code}
            value={name}
            problem={problemOf(code)}
            onChange={(changed) =>
              setValues({ ...values, names: { ...values.names, [code]: changed } })
            }
          />
        ))}
      </div>
      <ForumPlaceFields
        formKey={formKey}
        values={values}
        forums={forums}
        problemOf={problemOf}
        onChange={setValues}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={admin.isBusy}>
          {t('save')}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
