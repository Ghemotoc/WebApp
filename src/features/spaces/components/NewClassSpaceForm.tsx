/**
 * NewClassSpaceForm: "Create a class space" for a teacher with the badge, at
 * /spaces/new?kind=class (bundle BOOKS-8, part 8b; board G07-ClassNew, user story 8.7).
 *
 * What it shows: the page title and its line, then two columns on wide screens (the form at
 * 1.8 parts, "What the grade changes" at 1 part, 64 px apart), one column on tablets and phones.
 * The form: class name, grade, school and description, the Class points switch (off for every
 * new class, S1-E8-16 criterion 1) and "Create the class" with Cancel. "Create the class" names
 * what is missing in words rather than being greyed out (DoD). Once made, the class page opens
 * with the class's first code and link (user story 8.7: "Creating it opens the class with the
 * class code and an invite link to share").
 * Who shows it: NewSpacePage, when a teacher asked for a class space.
 * What it calls: ClassNewFields, ClassGradeGuide, Switch; useStartClass → create_class_space(),
 * set_class_points() and make_class_invite().
 */
import { useId, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';
import { Switch } from '@/components/ui/Switch';
import { errorShownByHook } from '@/lib/errorShownByHook';

import type { SpaceSettings } from '../api/spaces';
import { useStartClass } from '../hooks/useStartClass';
import { classFieldIds, type ClassNewMissing, type ClassNewValues } from '../lib/classNewForm';
import { spaceFailureText } from '../lib/spaceFailures';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { ClassGradeGuide } from './ClassGradeGuide';
import { ClassNewFields } from './ClassNewFields';

/** A new class's fields before the teacher types. */
const emptyValues: ClassNewValues = { name: '', grade: '', school: '', description: '' };

/**
 * Which needed fields are empty, in the order the form shows them.
 *
 * @param values - what the teacher typed
 * @returns the missing fields
 */
function missingFields(values: ClassNewValues): ClassNewMissing {
  return {
    name: values.name.trim() === '',
    grade: values.grade === '',
    school: values.school.trim() === '',
  };
}

/**
 * The settings create_class_space takes: a class is always private to its members, who post
 * and join only with the code (spaces_class_is_private), so only the words and banner matter.
 *
 * @param values - what the teacher typed
 * @returns the space settings
 */
function classSettings(values: ClassNewValues): SpaceSettings {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    rules: '',
    posting: 'members',
    joining: 'approve',
    readers: 'members',
    banner: 'plum',
  };
}

/**
 * The Class points switch in its box (board G07): the name and what it does at the left.
 *
 * @param props.isOn - whether points start on
 * @param props.onToggle - flips it
 * @returns the box
 */
function ClassPointsStart({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) {
  const { t } = useSpacesTranslation();
  const hintId = useId();
  return (
    <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-4">
      <div className="flex min-w-0 flex-col">
        <span className="type-label text-ink-heading">{t('classNew.points')}</span>
        <span id={hintId} className="type-meta">
          {t('classNew.pointsHint')}
        </span>
      </div>
      <Switch label={t('classNew.points')} isOn={isOn} onToggle={onToggle} describedBy={hintId} />
    </div>
  );
}

/**
 * The form itself: the fields, the switch, any refusal and the two buttons.
 *
 * @returns the form
 */
function ClassNewForm() {
  const { t } = useSpacesTranslation();
  const navigate = useNavigate();
  const starting = useStartClass();
  const [values, setValues] = useState(emptyValues);
  const [withPoints, setWithPoints] = useState(false);
  const [wasSent, setWasSent] = useState(false);
  const change = (patch: Partial<ClassNewValues>) =>
    setValues((current) => ({ ...current, ...patch }));
  // Step 1: what is missing shows only after a press, and goes once the field is filled.
  const missing = wasSent ? missingFields(values) : {};
  const field = starting.failure?.details.field;
  const nameProblem = field?.field === 'name' ? field : null;
  const general =
    starting.failure === null || nameProblem !== null
      ? null
      : t(...spaceFailureText(starting.failure));

  /** Says what is missing, or makes the class and opens it with its first code. */
  function send(event: FormEvent) {
    event.preventDefault();
    setWasSent(true);
    const firstMissing = (['name', 'grade', 'school'] as const).find(
      (key) => missingFields(values)[key] === true,
    );
    if (firstMissing !== undefined) {
      document.getElementById(classFieldIds[firstMissing])?.focus();
      return;
    }
    const details = { grade: Number(values.grade), school: values.school.trim() };
    void starting
      .run({ settings: classSettings(values), details, withPoints })
      .then((made) => navigate(`/spaces/${made.slug}`, { state: { newInvite: made.invite } }))
      .catch(errorShownByHook);
  }

  return (
    <form onSubmit={send} noValidate className="flex flex-col gap-6">
      <ClassNewFields values={values} change={change} missing={missing} nameProblem={nameProblem} />
      <ClassPointsStart isOn={withPoints} onToggle={() => setWithPoints((isOn) => !isOn)} />
      {general !== null && <Notice tone="error">{general}</Notice>}
      <ButtonRow>
        <Button type="submit" disabled={starting.isRunning}>
          {t('classNew.create')}
        </Button>
        <Link to="/spaces" className={buttonClassName({ variant: 'text' })}>
          {t('classNew.cancel')}
        </Link>
      </ButtonRow>
    </form>
  );
}

/**
 * Renders the title, its line and the two columns.
 *
 * @returns the page's content under the breadcrumb
 */
export function NewClassSpaceForm() {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      <header className="flex flex-col gap-2">
        <h1 className="page-title">{t('classNew.title')}</h1>
        <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('classNew.intro')}</p>
      </header>
      <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] lg:gap-16">
        <ClassNewForm />
        <ClassGradeGuide />
      </div>
    </div>
  );
}
