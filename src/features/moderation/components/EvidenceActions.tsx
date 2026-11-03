/**
 * EvidenceActions: what a safeguarding moderator can do with the evidence about a suspected child
 * sexual abuse image (bundle ADMIN-2, part e2b; Robert's brief of 2 Nov 2026, section 4):
 * - change the description for the police (a match from Arachnid Shield starts with a stand-in);
 * - put a legal hold on the evidence when the police ask within the 5 years, or lift it;
 * - close the uploader's account for good, which a match needs a person to decide; the person gets
 *   a statement of reasons in their own language, with how to appeal.
 * Each action asks for its text in a small inline form and is written to the audit log.
 * Who shows it: AbuseImageEvidencePanel. What it calls: the change() it is given.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { brand } from '@/config/brand';

import type { AbuseImageEvidence } from '../api/abuseImageEvidence';
import type { useAbuseImageEvidence } from '../hooks/useAbuseImageEvidence';

import { ReasonForm } from './ReasonForm';

/** Which inline form is open. */
type OpenForm = 'describe' | 'hold' | 'close' | null;

/** What the actions need. */
interface EvidenceActionsProps {
  caseId: string;
  evidence: AbuseImageEvidence;
  state: ReturnType<typeof useAbuseImageEvidence>;
}

/**
 * The inline form for the open action.
 *
 * @returns the form, or null when none is open
 */
function ActionForm(props: EvidenceActionsProps & { form: OpenForm; onClose: () => void }) {
  const { t, i18n } = useTranslation('moderation');
  const { evidence, state } = props;
  if (props.form === null) return null;
  // The person reads the account message in their own language.
  const inUploaderLanguage = i18n.getFixedT(evidence.uploaderLocale, 'moderation');
  const actions = {
    describe: (text: string) =>
      state.change({ kind: 'describe', evidenceId: evidence.id, description: text }),
    hold: (text: string) =>
      state.change({
        kind: 'hold',
        evidenceId: evidence.id,
        shouldHold: !evidence.legalHold,
        reason: text,
      }),
    close: (text: string) =>
      state.change({
        kind: 'close_account',
        caseId: props.caseId,
        note: text,
        message: inUploaderLanguage('pictures.closeAccountMessage', {
          link: `${brand.siteUrl}/legal/guidelines`,
        }),
      }),
  };
  const labels = { describe: 'describeLabel', hold: 'holdReason', close: 'closeNote' } as const;
  const form = props.form;
  return (
    <ReasonForm
      id={`evidence-${form}`}
      label={t(`abuseEvidence.${labels[form]}`)}
      confirmLabel={t('abuseEvidence.confirm')}
      isBusy={state.isChanging}
      onConfirm={async (text) => {
        await actions[form](text);
        props.onClose();
      }}
      onCancel={props.onClose}
    />
  );
}

/**
 * Renders the buttons, the open form and any refusal.
 *
 * @returns the actions
 */
export function EvidenceActions(props: EvidenceActionsProps) {
  const { t } = useTranslation('moderation');
  const [form, setForm] = useState<OpenForm>(null);
  const { evidence } = props;
  const canClose = !evidence.accountClosed && !evidence.uploaderIsStaff;
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-body">
        {evidence.accountClosed ? t('abuseEvidence.accountClosed') : t('abuseEvidence.accountOpen')}
      </p>
      {evidence.uploaderIsStaff && (
        <Notice tone="warning">{t('abuseEvidence.accountStaff')}</Notice>
      )}
      {props.state.changeFailure !== null && (
        <Notice tone="error">{t(`failures.${props.state.changeFailure}`)}</Notice>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setForm('describe')}>
          {t('abuseEvidence.describe')}
        </Button>
        <Button variant="secondary" onClick={() => setForm('hold')}>
          {evidence.legalHold ? t('abuseEvidence.liftHold') : t('abuseEvidence.setHold')}
        </Button>
        {canClose && (
          <Button variant="destructive" onClick={() => setForm('close')}>
            {t('abuseEvidence.close')}
          </Button>
        )}
      </div>
      <ActionForm {...props} form={form} onClose={() => setForm(null)} />
    </div>
  );
}
