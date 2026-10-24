/**
 * The words around the report form's fields: a label with "(required)" or "(optional)" and each
 * problem's message (story S1-E10-02).
 *
 * Who calls it: ContentNoticeFields and RemovalOrderFields. What it calls: the "notices" texts.
 */
import { useTranslation } from 'react-i18next';

import { noticeLimits } from '@/schemas/notice';

import type { NoticeProblem } from '../lib/noticeDraft';

/**
 * A field's label with "(required)" or "(optional)" written out, so it never rests on an
 * asterisk or colour alone (WCAG 2.2, 3.3.2).
 *
 * @returns the label text
 */
export function useFieldLabel() {
  const { t } = useTranslation('notices');
  return (labelKey: string, isRequired: boolean) =>
    `${t(labelKey)} (${t(isRequired ? 'form.required' : 'form.optional')})`;
}

/**
 * A problem's message, or undefined when there is none.
 *
 * @returns a function from the problem to its words
 */
export function useProblemMessage() {
  const { t } = useTranslation('notices');
  return (problem: NoticeProblem | undefined) =>
    problem === undefined
      ? undefined
      : t(`form.problems.${problem}`, { max: noticeLimits.explanation });
}
