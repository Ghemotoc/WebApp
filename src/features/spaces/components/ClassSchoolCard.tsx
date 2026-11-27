/**
 * ClassSchoolCard: the school a class belongs to, in class settings (bundle BOOKS-8, part 8b;
 * user story 8.8: "Class settings holds the name, grade, school, class points and the code").
 *
 * What it shows: what the school is for (it prints on class certificates), a text field with the
 * saved name and "Save the school". An empty name says what is missing rather than being greyed
 * out (DoD). An archived class keeps its school.
 * Who shows it: SpaceSettingsPage, for the teacher of a class space.
 * What it calls: useClassSchool → set_class_school(), which writes the change to the class's log.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type { Space } from '../api/spaces';
import { useClassSchool } from '../hooks/useStartClass';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the card.
 *
 * @param props.space - the class
 * @returns the card
 */
export function ClassSchoolCard({ space }: { space: Space }) {
  const { t } = useSpacesTranslation();
  const saver = useClassSchool(space.slug);
  const [school, setSchool] = useState(space.schoolName ?? '');
  const [isMissing, setIsMissing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  /** Says the name is missing, or saves it and says so. */
  function save(event: FormEvent) {
    event.preventDefault();
    setIsSaved(false);
    if (school.trim() === '') {
      setIsMissing(true);
      document.getElementById('class-school')?.focus();
      return;
    }
    setIsMissing(false);
    void saver
      .change(school)
      .then((saved) => {
        setSchool(saved);
        setIsSaved(true);
      })
      .catch(errorShownByHook);
  }

  return (
    <section
      aria-labelledby="class-school-heading"
      className="flex w-full max-w-[760px] flex-col gap-3 rounded-card border border-border bg-surface p-6"
    >
      <h2 id="class-school-heading" className="m-0 type-heading">
        {t('classSchool.title')}
      </h2>
      <form noValidate onSubmit={save} className="flex max-w-[480px] flex-col gap-3">
        <TextInput
          id="class-school"
          label={t('classNew.school')}
          hint={t('classNew.schoolHint')}
          value={school}
          maxLength={120}
          disabled={space.isArchived}
          onChange={(event) => setSchool(event.target.value)}
          errorMessage={isMissing ? t('classNew.schoolMissing') : undefined}
        />
        {!space.isArchived && (
          <Button type="submit" className="self-start" disabled={saver.isRunning}>
            {t('classSchool.save')}
          </Button>
        )}
      </form>
      <div aria-live="polite">
        {saver.failure !== null && (
          <Notice tone="error">{t(`classLock.failures.${saver.failure.failure}`)}</Notice>
        )}
        {isSaved && saver.failure === null && (
          <Notice tone="success">{t('classSchool.saved')}</Notice>
        )}
      </div>
    </section>
  );
}
