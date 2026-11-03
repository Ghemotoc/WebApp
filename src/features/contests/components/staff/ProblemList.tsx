/**
 * ProblemList: what still stops a contest from opening, one line each (story S1-E11-15
 * criterion 2; bundle CONTESTS-13b1).
 *
 * Who shows it: ContestOpenPanel and ContestForm's save notice. The codes come from
 * contest_problems() in the database; an unknown code falls back to a general line.
 */
import { useContestTranslation } from '../../registerContestTranslations';

/**
 * Renders the list, or nothing when there are no problems.
 *
 * @param props.problems - the problem codes
 * @returns a list
 */
export function ProblemList({ problems }: { problems: string[] }) {
  const { t } = useContestTranslation();
  if (problems.length === 0) return null;
  return (
    <ul className="m-0 flex flex-col gap-1 pl-5 text-sm">
      {problems.map((problem) => (
        <li key={problem}>
          {t(`staff.editor.problems.${problem}`, {
            defaultValue: t('staff.editor.problems.other'),
          })}
        </li>
      ))}
    </ul>
  );
}
