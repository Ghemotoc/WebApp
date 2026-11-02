/**
 * NewClassSpaceForm: "Set up a class" on Staff › Schools › Class spaces (bundle CLASSES, part d;
 * story S1-E8-11 criterion 10: staff create the space, name the teacher as owner and print the
 * invite code, the manual pilot mode).
 *
 * What it shows: the teacher's username (an account that already has the Teacher badge, approved
 * on Verify teachers), the class's name, the school's name and the description members see, then
 * "Set up the class". After it, a link to the new class; its code is made from the class's card
 * below. Plain components, no doodles.
 * Who shows it: ClassSpacesPage. What it calls: useCreateStaffClassSpace →
 * admin_create_class_space().
 */
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';

import type { NewStaffClassSpace } from '../../api/staffClassSpaces';
import { useCreateStaffClassSpace } from '../../hooks/useStaffClassSpaces';

/** The empty form. */
const emptyForm: NewStaffClassSpace = {
  teacherHandle: '',
  name: '',
  schoolName: '',
  description: '',
};

/** The four fields, each changing one answer. */
function ClassFields(props: {
  values: NewStaffClassSpace;
  onChange: (values: NewStaffClassSpace) => void;
}) {
  const { values, onChange } = props;
  const { t } = useTranslation('staff');
  return (
    <>
      <TextInput
        id="class-teacher"
        label={t('classSpaces.teacher')}
        hint={t('classSpaces.teacherHint')}
        autoComplete="off"
        value={values.teacherHandle}
        onChange={(event) => onChange({ ...values, teacherHandle: event.target.value })}
      />
      <TextInput
        id="class-name"
        label={t('classSpaces.name')}
        value={values.name}
        onChange={(event) => onChange({ ...values, name: event.target.value })}
      />
      <TextInput
        id="class-school"
        label={t('classSpaces.school')}
        hint={t('classSpaces.schoolHint')}
        value={values.schoolName}
        onChange={(event) => onChange({ ...values, schoolName: event.target.value })}
      />
      <Textarea
        id="class-description"
        label={t('classSpaces.description')}
        value={values.description}
        onChange={(event) => onChange({ ...values, description: event.target.value })}
      />
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the card with the form
 */
export function NewClassSpaceForm() {
  const { t } = useTranslation('staff');
  const creating = useCreateStaffClassSpace();
  const [values, setValues] = useState(emptyForm);

  /** Sets up the class, then empties the form for the next one. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = await creating.create(values).catch(() => null);
    if (slug !== null) setValues(emptyForm);
  }

  return (
    <section
      aria-labelledby="new-class-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
    >
      <h2 id="new-class-heading" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('classSpaces.newTitle')}
      </h2>
      <p className="m-0 text-body">{t('classSpaces.newIntro')}</p>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <ClassFields values={values} onChange={setValues} />
        <div aria-live="polite">
          {creating.failure !== null && (
            <Notice tone="error">{t(`classSpaces.failures.${creating.failure.failure}`)}</Notice>
          )}
          {creating.created !== null && creating.failure === null && (
            <Notice tone="success">
              {t('classSpaces.created')}{' '}
              <Link to={`/spaces/${creating.created}`}>{t('classSpaces.open')}</Link>
            </Notice>
          )}
        </div>
        <Button type="submit" className="self-start" disabled={creating.isRunning}>
          {t('classSpaces.create')}
        </Button>
      </form>
    </section>
  );
}
