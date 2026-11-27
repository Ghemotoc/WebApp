/**
 * TeacherPointsStepper: "− 7 +  out of 10", the teacher's points as a number with a button
 * either side (bundle BOOKS-8, part 8b; board G10-TeacherPoints, user story 8.10: "0 to 10 with −
 * and +, or typed").
 *
 * The number is a real text field the teacher can type into; − and + move it by one and stop at
 * 0 and at the most a teacher may give. Each button is 44 px and named for what it does, so it
 * works by keyboard and screen reader (WCAG 2.5.8, 4.1.2).
 * Who uses it: TeacherPointsForm. What it calls: nothing.
 */
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** What the stepper needs. */
interface TeacherPointsStepperProps {
  /** The field's id. */
  id: string;
  /** What the teacher typed, '' for none yet. */
  typed: string;
  max: number;
  onChange: (typed: string) => void;
  /** The id of the line that says the number is out of range, when shown. */
  problemId?: string;
}

/** The look of − and +: a 44 px round quiet button. */
const stepClasses =
  'inline-flex size-11 items-center justify-center rounded-full button-glass type-heading leading-none';

/**
 * Renders the stepper.
 *
 * @returns the two buttons, the field and "out of 10"
 */
export function TeacherPointsStepper({
  id,
  typed,
  max,
  onChange,
  problemId,
}: TeacherPointsStepperProps) {
  const { t } = useClassPointsTranslation();
  // Step 1: the number now, treating an empty or unreadable field as 0.
  const current = /^\d+$/.test(typed.trim()) ? Number(typed.trim()) : 0;
  // Step 2: − and + stay within 0 and the most a teacher may give.
  const step = (by: number) => onChange(String(Math.min(max, Math.max(0, current + by))));
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={stepClasses}
        aria-label={t('chapter.teacher.less')}
        onClick={() => step(-1)}
      >
        <span aria-hidden="true">−</span>
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-label={t('chapter.teacher.pointsLabel', { max })}
        aria-describedby={problemId}
        aria-invalid={problemId === undefined ? undefined : true}
        value={typed}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-16 rounded-field border border-control-border bg-surface text-center font-heading type-title"
      />
      <button
        type="button"
        className={stepClasses}
        aria-label={t('chapter.teacher.more')}
        onClick={() => step(1)}
      >
        <span aria-hidden="true">+</span>
      </button>
      <span className="type-meta">{t('chapter.teacher.outOf', { max })}</span>
    </div>
  );
}
