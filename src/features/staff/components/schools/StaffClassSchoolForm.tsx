/**
 * StaffClassSchoolForm: the school a class belongs to, which staff write or correct (bundle
 * CLASSES, part d; story S1-E8-11; the name prints on class certificates, S1-E8-12).
 *
 * Who shows it: StaffClassCard, after "Change the school". What it calls:
 * useSetStaffClassSchool → admin_set_class_school(), which is logged with the old and new names.
 */
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { StaffClassSpace } from '../../api/staffClassSpaces';
import { useSetStaffClassSchool } from '../../hooks/useStaffClassSpaces';

/**
 * Renders the form.
 *
 * @param props.space - the class
 * @param props.onDone - closes the form after a save or Cancel
 * @returns the field, Save and Cancel
 */
export function StaffClassSchoolForm(props: { space: StaffClassSpace; onDone: () => void }) {
  const { space, onDone } = props;
  const { t } = useTranslation('staff');
  const saving = useSetStaffClassSchool(space.slug);
  const [school, setSchool] = useState(space.schoolName ?? '');

  /** Saves the name, then closes the form. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await saving.save(school).catch(() => null);
    if (saved !== null) onDone();
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={save} noValidate>
      <TextInput
        id={`school-${space.slug}`}
        label={t('classSpaces.school')}
        value={school}
        onChange={(event) => setSchool(event.target.value)}
      />
      {saving.failure !== null && (
        <Notice tone="error">{t(`classSpaces.failures.${saving.failure.failure}`)}</Notice>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving.isRunning}>
          {t('classSpaces.saveSchool')}
        </Button>
        <Button variant="text" onClick={onDone}>
          {t('classSpaces.cancel')}
        </Button>
      </div>
    </form>
  );
}
