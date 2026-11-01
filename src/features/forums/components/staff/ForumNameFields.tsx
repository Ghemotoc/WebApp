/**
 * ForumNameFields: a forum's name and description in one language, on the staff form (bundle
 * FORUMS-1, part a). Each field says what the database refused ("ro:empty").
 *
 * Who shows it: ForumForm, once per language. It calls nothing.
 */
import { useTranslation } from 'react-i18next';

import { TextInput } from '@/components/ui/TextInput';

import type { ForumName } from '../../api/forumAdmin';

/** What the fields need. */
interface ForumNameFieldsProps {
  /** The form's key, so ids stay unique when two forms are open. */
  formKey: string;
  languageCode: string;
  value: ForumName;
  /** The database's problem for this language ("empty", "too_long"), if any. */
  problem: string | undefined;
  onChange: (value: ForumName) => void;
}

/**
 * Renders the two fields.
 *
 * @returns a fieldset-like group with the name and the description
 */
export function ForumNameFields({
  formKey,
  languageCode,
  value,
  problem,
  onChange,
}: ForumNameFieldsProps) {
  const { t } = useTranslation('forumsAdmin');
  const language = t(`languages.${languageCode}`, { defaultValue: languageCode });
  // A description that is too long is marked on the description; anything else on the name.
  const nameProblem = problem === 'description_too_long' ? undefined : problem;
  const descriptionProblem = problem === 'description_too_long' ? problem : undefined;
  return (
    <div className="flex flex-col gap-3">
      <TextInput
        id={`forum-${formKey}-${languageCode}-name`}
        label={t('nameIn', { language })}
        lang={languageCode}
        value={value.name}
        maxLength={80}
        errorMessage={nameProblem === undefined ? undefined : t(`problems.${nameProblem}`)}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
      />
      <TextInput
        id={`forum-${formKey}-${languageCode}-description`}
        label={t('descriptionIn', { language })}
        lang={languageCode}
        value={value.description}
        maxLength={200}
        errorMessage={
          descriptionProblem === undefined ? undefined : t(`problems.${descriptionProblem}`)
        }
        onChange={(event) => onChange({ ...value, description: event.target.value })}
      />
    </div>
  );
}
