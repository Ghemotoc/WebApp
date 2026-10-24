/**
 * CasePage: /staff/moderation/cases/:caseId, one case: what was reported, the reports, the
 * decisions, the decision form, and (S1-E10-06) the account's sanctions, the pause and restore
 * actions (story S1-E10-03a; architecture 1.8.4, screen 8.3).
 *
 * Board (ModCase): "Case R-2318", the tier and deadline pills, the reason, the summary line, the
 * reported content and the reporter's note, the Decision panel. Not in part a: the reported
 * content itself (a profile has none to show yet), the records panel, the account and reporter
 * panels, the statement of reasons preview, moderator mail, the sanction ladder and the
 * safeguarding checklist (S1-E10-03b, S1-E10-04, S1-E10-06, S1-E10-10, S1-E11-13). Plain
 * components, no doodles.
 * Who shows it: the router, inside StaffLayout. The database refuses anyone outside moderation
 * staff, and hides a safeguarding case from staff without the permission (Q6): to them the page
 * says there is no case here.
 * What it calls: useCase → api/moderationQueue.ts.
 */
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoPill } from '@/components/ui/InfoPill';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { QueueCase } from '../api/moderationQueue';
import { useCase } from '../hooks/useCase';
import { useSanctions } from '../hooks/useSanctions';
import { registerModerationTranslations } from '../registerModerationTranslations';

import { AccountSanctions } from './AccountSanctions';
import { CaseDecisions } from './CaseDecisions';
import { CaseNotices } from './CaseNotices';
import { CaseReports } from './CaseReports';
import { CaseSignals } from './CaseSignals';
import { DeadlineLabel } from './DeadlineLabel';
import { DecisionForm } from './DecisionForm';
import { ModeratedItemNotice } from './ModeratedItemNotice';
import { TierPill } from './TierPill';

/**
 * The one-line summary under the heading: what, how many reports, when it was received.
 *
 * @param theCase - the case
 * @param t - the moderation translator
 * @param language - the page's language
 * @returns the sentence
 */
function summaryText(theCase: QueueCase, t: TFunction<'moderation'>, language: string): string {
  const when = new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(theCase.receivedAt));
  if (theCase.source === 'authority_order') {
    return t('case.summaryOrder', { what: theCase.itemSummary, when });
  }
  if (theCase.source === 'picture_check') {
    return t('case.summaryPicture', { what: theCase.itemSummary, when });
  }
  return t('case.summary', { what: theCase.itemSummary, count: theCase.reportCount, when });
}

/**
 * The heading block: eyebrow, "Case R-000123", the pills and the summary line.
 *
 * @returns the header
 */
function CaseHeader({ theCase }: { theCase: QueueCase }) {
  const { t, i18n } = useTranslation('moderation');
  const reason =
    theCase.topReason === null ? t(`sources.${theCase.source}`) : t(`reasons.${theCase.topReason}`);
  return (
    <div className="flex max-w-[720px] flex-col gap-3">
      <Eyebrow>{t('case.eyebrow')}</Eyebrow>
      <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
        {t('case.heading', { reference: theCase.reference })}
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        <TierPill tier={theCase.tier} />
        <DeadlineLabel theCase={theCase} />
        <InfoPill tone="neutral">{reason}</InfoPill>
        <InfoPill tone={theCase.status === 'open' ? 'sage' : 'neutral'}>
          {t(`statuses.${theCase.status}`)}
        </InfoPill>
      </div>
      <p className="m-0 text-body">{summaryText(theCase, t, i18n.language)}</p>
      <p className="m-0 text-body">
        <span className="font-semibold text-heading">{t('case.reported')}: </span>
        {theCase.reportedHandle === null
          ? t('case.noHandle')
          : t('case.reportedAccount', {
              handle: theCase.reportedHandle,
              ageBand: t(`ageBands.${theCase.reportedAgeBand}`),
            })}
      </p>
      <CaseSignals theCase={theCase} />
    </div>
  );
}

/**
 * What goes on the page once the case is known: the header, the reports, the decisions, the
 * account's sanctions, and the form (or the decided notice and what happened to the item).
 *
 * @returns the page's body
 */
function CaseBody({
  caseState,
  sanctions,
}: {
  caseState: ReturnType<typeof useCase>;
  sanctions: ReturnType<typeof useSanctions>;
}) {
  const { t } = useTranslation('moderation');
  if (caseState.loadFailure === 'not_allowed') {
    return <p className="m-0 text-body">{t('case.notAllowed')}</p>;
  }
  if (caseState.loadFailure !== null) {
    return <Notice tone="error">{t(`failures.${caseState.loadFailure}`)}</Notice>;
  }
  if (caseState.isLoading) return <p className="m-0 text-meta">{t('case.loading')}</p>;
  if (caseState.theCase === null) return <p className="m-0 text-body">{t('case.notFound')}</p>;
  const theCase = caseState.theCase;
  return (
    <>
      <CaseHeader theCase={theCase} />
      <div className="grid max-w-[1100px] grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <CaseReports reports={caseState.reports} sanctions={sanctions} />
          <CaseNotices caseId={theCase.id} />
          <CaseDecisions actions={caseState.actions} />
          <AccountSanctions sanctions={sanctions} />
        </div>
        <div className="flex flex-col gap-4">
          {caseState.hasDecided && <Notice tone="success">{t('case.form.sent')}</Notice>}
          {theCase.status === 'open' ? (
            <DecisionForm
              onDecide={caseState.decide}
              isDeciding={caseState.isDeciding}
              failure={caseState.decideFailure}
            />
          ) : (
            <Notice tone="info">
              {t('case.decidedNotice', {
                action: theCase.decision === null ? '' : t(`actions.${theCase.decision}`),
              })}
            </Notice>
          )}
          <ModeratedItemNotice sanctions={sanctions} />
        </div>
      </div>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the case screen
 */
export function CasePage() {
  const { i18n } = useTranslation();
  registerModerationTranslations(i18n);
  const { t } = useTranslation('moderation');
  const { caseId = '' } = useParams();
  const caseState = useCase(caseId);
  const sanctions = useSanctions(caseId, caseState.theCase?.reportedUserId ?? null);
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>
        {t('case.documentTitle', { reference: caseState.theCase?.reference ?? caseId.slice(0, 8) })}
      </title>
      <Link to="/staff/moderation" className="w-fit text-sm font-semibold text-link underline">
        {t('case.back')}
      </Link>
      <CaseBody caseState={caseState} sanctions={sanctions} />
    </PageContainer>
  );
}
