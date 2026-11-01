/**
 * ForumPlaceFields: where a forum sits and how it looks, on the staff form (bundle FORUMS-1,
 * part a; S1-E8-01, first criterion: "parent" and "order"): Sits in, Address, Order and, for a
 * category only, the pin, the colour and the doodle.
 *
 * Who shows it: ForumForm. It calls nothing: the form keeps the values.
 */
import { useTranslation } from 'react-i18next';

import { doodleSources } from '@/components/ui/doodleSources';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { ForumChanges, StaffForum } from '../../api/forumAdmin';
import type { ForumAccent } from '../../api/forumIndex';
import { forumAccents, parentChoices, staffForumName } from '../../lib/forumForm';

/** What the fields need. */
interface ForumPlaceFieldsProps {
  formKey: string;
  values: ForumChanges;
  forums: StaffForum[];
  /** The database's problem for a field ("slug" → "taken"), if any. */
  problemOf: (field: string) => string | undefined;
  onChange: (values: ForumChanges) => void;
}

/** The value the "nothing: it is a category" choice stands for. */
const noParent = '';

/**
 * The pin, the colour and the doodle: categories only.
 *
 * @returns the three controls
 */
function CategoryLookFields({
  formKey,
  values,
  onChange,
}: Omit<ForumPlaceFieldsProps, 'forums' | 'problemOf'>) {
  const { t } = useTranslation('forumsAdmin');
  const doodleOptions = [
    { value: '', label: t('noDoodle') },
    ...Object.keys(doodleSources).map((name) => ({ value: name, label: name })),
  ];
  return (
    <div className="flex flex-col gap-3">
      <label className="flex min-h-11 items-center gap-3 text-body">
        <input
          type="checkbox"
          className="size-5"
          checked={values.isPinned}
          onChange={(event) => onChange({ ...values, isPinned: event.target.checked })}
        />
        {t('pinCategory')}
      </label>
      <Select
        id={`forum-${formKey}-accent`}
        label={t('accent')}
        isLabelVisible
        options={forumAccents.map((accent) => ({ value: accent, label: t(`accents.${accent}`) }))}
        value={values.accent}
        onChange={(accent) => onChange({ ...values, accent: accent as ForumAccent })}
      />
      <Select
        id={`forum-${formKey}-doodle`}
        label={t('doodle')}
        isLabelVisible
        options={doodleOptions}
        value={values.doodle ?? ''}
        onChange={(doodle) => onChange({ ...values, doodle: doodle === '' ? null : doodle })}
      />
    </div>
  );
}

/**
 * "Sits in": nothing (a category), or a category or forum, with the database's refusal under it.
 *
 * @returns the drop-down and its message
 */
function ParentField({ formKey, values, forums, problemOf, onChange }: ForumPlaceFieldsProps) {
  const { t, i18n } = useTranslation('forumsAdmin');
  const parentOptions = [
    { value: noParent, label: t('noParent') },
    ...parentChoices(forums, values.forumId).map((forum) => ({
      value: forum.id,
      label: `${t(`levels.${forum.level}`)}: ${staffForumName(forum, i18n.language)}`,
    })),
  ];
  const parentProblem = problemOf('parent');
  return (
    <>
      <Select
        id={`forum-${formKey}-parent`}
        label={t('parent')}
        isLabelVisible
        options={parentOptions}
        value={values.parentId ?? noParent}
        onChange={(parentId) =>
          // A forum that moves under another stops being a pinned category.
          onChange({
            ...values,
            parentId: parentId === noParent ? null : parentId,
            isPinned: false,
          })
        }
      />
      {parentProblem !== undefined && (
        <p className="m-0 text-sm text-destructive">{t(`problems.${parentProblem}`)}</p>
      )}
    </>
  );
}

/**
 * Renders the fields.
 *
 * @returns Sits in, Address, Order and, for a category, its look
 */
export function ForumPlaceFields(props: ForumPlaceFieldsProps) {
  const { formKey, values, problemOf, onChange } = props;
  const { t } = useTranslation('forumsAdmin');
  const slugProblem = problemOf('slug');
  return (
    <div className="flex flex-col gap-3">
      <ParentField {...props} />
      <TextInput
        id={`forum-${formKey}-slug`}
        label={t('address')}
        hint={t('addressHint')}
        value={values.slug}
        maxLength={60}
        errorMessage={slugProblem === undefined ? undefined : t(`problems.${slugProblem}`)}
        onChange={(event) => onChange({ ...values, slug: event.target.value })}
      />
      <TextInput
        id={`forum-${formKey}-position`}
        label={t('position')}
        hint={t('positionHint')}
        type="number"
        min={0}
        max={10000}
        className="w-32"
        value={String(values.position)}
        onChange={(event) => onChange({ ...values, position: Number(event.target.value) || 0 })}
      />
      {values.parentId === null && (
        <CategoryLookFields formKey={formKey} values={values} onChange={onChange} />
      )}
    </div>
  );
}
