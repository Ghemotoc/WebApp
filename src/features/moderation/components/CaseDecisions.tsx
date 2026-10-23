/**
 * CaseDecisions: "Decisions", what staff decided on a case and the note each wrote (story
 * S1-E10-03a; board 8.3's case log).
 *
 * Who shows it: CasePage. One decision closes a case today; appeals (S1-E10-07) will add more.
 */
import { useTranslation } from 'react-i18next';

import type { CaseAction } from '../api/moderationQueue';

/**
 * Renders the section.
 *
 * @param props.actions - the case's decisions, newest first
 * @returns the section
 */
export function CaseDecisions({ actions }: { actions: CaseAction[] }) {
  const { t, i18n } = useTranslation('moderation');
  const whenText = (isoTime: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(isoTime),
    );
  return (
    <section aria-labelledby="case-decisions-heading" className="flex flex-col gap-4">
      <h2
        id="case-decisions-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('case.decisionsHeading')}
      </h2>
      {actions.length === 0 && <p className="m-0 text-body">{t('case.noDecisions')}</p>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {actions.map((action) => (
          <li
            key={action.createdAt}
            className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
          >
            <p className="m-0 text-sm font-semibold text-heading">
              {t('case.decisionBy', {
                action: t(`actions.${action.action}`),
                handle: action.staffHandle ?? t('case.noHandle'),
                when: whenText(action.createdAt),
              })}
            </p>
            <p className="m-0 text-body">{action.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
