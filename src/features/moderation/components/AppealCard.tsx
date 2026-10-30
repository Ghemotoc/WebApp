/**
 * AppealCard: one appeal on the staff appeals page (story S1-E10-07; screen 8.4).
 *
 * Shows the appeal's reference and state, the decision it is about (its statement and case), who
 * appealed and why, and who made the original decision. An open appeal shows the decision form,
 * unless the caller made the original decision while someone else could decide: then it says so
 * (DSA art. 20(6), a different person where possible). A decided one shows the outcome, the note
 * and what the person was told. Plain components, no doodles.
 * Who shows it: AppealsPage. What it calls: AppealDecisionForm.
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';
import { LabelRows } from '@/components/ui/LabelRows';

import type { AppealDecision, StaffAppeal } from '../api/appeals';

import { AppealDecisionForm } from './AppealDecisionForm';

/** What the card needs. */
export interface AppealCardProps {
  appeal: StaffAppeal;
  isDeciding: boolean;
  onDecide: (appealId: string, decision: AppealDecision) => Promise<unknown>;
}

/**
 * The rows that describe the appeal.
 *
 * @returns label and value pairs
 */
function useAppealRows(appeal: StaffAppeal) {
  const { t, i18n } = useTranslation('moderation');
  const sent = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(appeal.createdAt));
  const rows = [
    {
      label: t('appeals.decisionAbout'),
      value: `${t(`appeals.actions.${appeal.statementAction}`)} · ${appeal.statementReference}`,
    },
    { label: t('appeals.item'), value: appeal.itemSummary ?? t('appeals.noItem') },
    {
      label: t('appeals.appellant'),
      value: appeal.appellantHandle === null ? t('appeals.noHandle') : `@${appeal.appellantHandle}`,
    },
    { label: t('appeals.sent'), value: sent },
    {
      label: t('appeals.why'),
      value: <span className="whitespace-pre-line">{appeal.explanation}</span>,
    },
    {
      label: t('appeals.originalDecider'),
      value:
        appeal.originalDeciderHandle === null
          ? t('appeals.noHandle')
          : `@${appeal.originalDeciderHandle}`,
    },
  ];
  if (appeal.caseReference !== null)
    rows.splice(1, 0, { label: t('appeals.case'), value: appeal.caseReference });
  if (appeal.status !== 'open') {
    rows.push({
      label: t('appeals.decidedBy'),
      value: appeal.decidedByHandle === null ? t('appeals.noHandle') : `@${appeal.decidedByHandle}`,
    });
    rows.push({ label: t('appeals.note'), value: appeal.decisionNote ?? '' });
    rows.push({ label: t('appeals.message'), value: appeal.messageToPerson ?? '' });
  }
  return rows;
}

/**
 * Renders the card.
 *
 * @returns a list item
 */
export function AppealCard({ appeal, isDeciding, onDecide }: AppealCardProps) {
  const { t } = useTranslation('moderation');
  const rows = useAppealRows(appeal);
  return (
    <li className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 font-heading text-lg font-bold text-heading">
          {t('appeals.cardHeading', { reference: appeal.reference })}
        </h2>
        <InfoPill tone={appeal.status === 'open' ? 'gold' : 'neutral'}>
          {t(`appeals.statuses.${appeal.status}`)}
        </InfoPill>
      </div>
      <LabelRows rows={rows} />
      {appeal.status === 'open' && !appeal.mayDecide && (
        <p className="m-0 text-sm text-body">{t('appeals.notYours')}</p>
      )}
      {appeal.status === 'open' && appeal.mayDecide && (
        <AppealDecisionForm
          reference={appeal.reference}
          isDeciding={isDeciding}
          onDecide={(decision) => onDecide(appeal.id, decision)}
        />
      )}
    </li>
  );
}
