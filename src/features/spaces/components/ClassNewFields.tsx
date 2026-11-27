/**
 * ClassNewFields: the four fields of "Create a class space": class name, grade, school and
 * description (bundle BOOKS-8, part 8b; board G07-ClassNew, user story 8.7: "Class name, grade
 * and school are needed").
 *
 * Each field is at most 480 px wide, as on the board. A field that was empty when "Create the
 * class" was pressed says what is missing under it (DoD: buttons are never greyed out).
 * Who uses it: NewClassSpaceForm. What it calls: SpaceNameField (the name is checked as the
 * teacher types), TextInput, Select, Textarea and FieldProblem.
 */
import { Select } from '@/components/ui/Select';
import { FieldProblem } from '@/components/ui/FieldProblem';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';

import type { SpaceFieldProblem } from '../api/spaces';
import { classFieldIds, type ClassNewMissing, type ClassNewValues } from '../lib/classNewForm';
import { useSpacesTranslation } from '../registerSpacesTranslations';

import { SpaceNameField } from './SpaceNameField';

/** The school years a class can be (create_class_space accepts 1 to 13). */
const grades = Array.from({ length: 13 }, (_unused, index) => String(index + 1));

/** What the fields need. */
interface ClassNewFieldsProps {
  values: ClassNewValues;
  change: (patch: Partial<ClassNewValues>) => void;
  missing: ClassNewMissing;
  /** The name's problem from the database after sending (taken, too long), or null. */
  nameProblem: SpaceFieldProblem | null;
}

/**
 * The grade drop-down, its hint and, when it was left empty, what is missing.
 *
 * @returns the field
 */
function GradeField({ values, change, missing }: Omit<ClassNewFieldsProps, 'nameProblem'>) {
  const { t } = useSpacesTranslation();
  const hintId = `${classFieldIds.grade}-hint`;
  const problemId = `${classFieldIds.grade}-problem`;
  const isMissing = missing.grade === true;
  // "Choose the grade" is a choice only until one is picked.
  const choose = values.grade === '' ? [{ value: '', label: t('classNew.gradeChoose') }] : [];
  const options = grades.map((grade) => ({
    value: grade,
    label: t('classNew.gradeOption', { grade }),
  }));
  return (
    <div className="flex flex-col gap-2">
      <Select
        id={classFieldIds.grade}
        label={t('classNew.grade')}
        isLabelAbove
        placement="form"
        options={[...choose, ...options]}
        value={values.grade}
        onChange={(grade) => change({ grade })}
        descriptionId={isMissing ? `${problemId} ${hintId}` : hintId}
        isInvalid={isMissing}
      />
      <FieldProblem id={problemId} isShown={isMissing}>
        {t('classNew.gradeMissing')}
      </FieldProblem>
      <p id={hintId} className="m-0 type-meta">
        {t('classNew.gradeHint')}
      </p>
    </div>
  );
}

/**
 * Renders the four fields.
 *
 * @returns the name, grade, school and description, in the board's order
 */
export function ClassNewFields({ values, change, missing, nameProblem }: ClassNewFieldsProps) {
  const { t } = useSpacesTranslation();
  return (
    <div className="flex max-w-[480px] flex-col gap-6">
      <SpaceNameField
        fieldId={classFieldIds.name}
        label={t('classNew.name')}
        hint={t('classNew.nameHint')}
        value={values.name}
        onChange={(name) => change({ name })}
        ownName={null}
        sentProblem={nameProblem}
        missingMessage={missing.name === true ? t('classNew.nameMissing') : undefined}
      />
      <GradeField values={values} change={change} missing={missing} />
      <TextInput
        id={classFieldIds.school}
        label={t('classNew.school')}
        hint={t('classNew.schoolHint')}
        value={values.school}
        maxLength={120}
        onChange={(event) => change({ school: event.target.value })}
        errorMessage={missing.school === true ? t('classNew.schoolMissing') : undefined}
      />
      <Textarea
        id={classFieldIds.description}
        label={t('classNew.description')}
        value={values.description}
        maxLength={300}
        rows={3}
        onChange={(event) => change({ description: event.target.value })}
      />
    </div>
  );
}
