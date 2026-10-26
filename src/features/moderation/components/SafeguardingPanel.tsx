/**
 * SafeguardingPanel: on a safeguarding case, the checklist, the support contacts for the person's
 * country, the evidence pack and the referral log (story S1-E10-10; board 8.3's safeguarding
 * checklist; DSA art. 18).
 *
 * Only staff with the safeguarding permission see a safeguarding case at all (Q6), so everyone
 * who sees this panel may use it. Building the evidence pack asks why, is logged as a sensitive
 * read and downloads a JSON file to hand to the authority; the file holds the account's email,
 * so it is never kept in the app. Plain staff components, no doodles.
 * Who shows it: CasePage, only for a safeguarding case. What it calls: useSafeguarding.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import type { Json } from '@/lib/database.types';

import { useSafeguarding } from '../hooks/useSafeguarding';

import { ReasonForm } from './ReasonForm';
import { ReferralLog } from './ReferralLog';
import { SupportContactsList } from './SupportContactsList';

/** The checklist's steps, in order (docs/runbooks/safeguarding.md). */
const checklistSteps = ['risk', 'emergency', 'contacts', 'evidence', 'refer', 'decide'] as const;

/**
 * Hands the pack to the browser as a file to save.
 *
 * @param pack - the evidence pack
 * @param reference - the case reference, for the file name
 */
function downloadPack(pack: Json, reference: string): void {
  const file = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const address = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = address;
  link.download = `evidence-${reference}.json`;
  link.click();
  URL.revokeObjectURL(address);
}

/**
 * "Build the evidence pack": asks why, then downloads it.
 *
 * @returns the button or the reason form
 */
function EvidencePack({
  safeguarding,
  reference,
}: {
  safeguarding: ReturnType<typeof useSafeguarding>;
  reference: string;
}) {
  const { t } = useTranslation('moderation');
  const [isAsking, setIsAsking] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-base font-semibold text-heading">{t('safeguarding.packHeading')}</h3>
      <p className="m-0 text-sm text-body">{t('safeguarding.packIntro')}</p>
      {safeguarding.packFailure !== null && (
        <Notice tone="error">{t(`failures.${safeguarding.packFailure}`)}</Notice>
      )}
      {isAsking ? (
        <ReasonForm
          id="evidence-reason"
          label={t('safeguarding.packReason')}
          confirmLabel={t('safeguarding.packConfirm')}
          isBusy={safeguarding.isBuilding}
          onConfirm={async (reason) => {
            downloadPack(await safeguarding.buildPack(reason), reference);
            setIsAsking(false);
          }}
          onCancel={() => setIsAsking(false)}
        />
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setIsAsking(true)}>
            {t('safeguarding.packBuild')}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Renders the panel.
 *
 * @param props.caseId - the case
 * @param props.reference - its reference, for the pack's file name
 * @returns the panel
 */
export function SafeguardingPanel({ caseId, reference }: { caseId: string; reference: string }) {
  const { t } = useTranslation('moderation');
  const safeguarding = useSafeguarding(caseId, true);
  return (
    <section
      aria-labelledby="safeguarding-heading"
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="safeguarding-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
        {t('safeguarding.heading')}
      </h2>
      <ol className="m-0 flex flex-col gap-1.5 pl-5 text-body">
        {checklistSteps.map((step) => (
          <li key={step}>{t(`safeguarding.steps.${step}`)}</li>
        ))}
      </ol>
      {safeguarding.contactsFailure !== null && (
        <Notice tone="error">{t(`failures.${safeguarding.contactsFailure}`)}</Notice>
      )}
      {safeguarding.contacts !== null && <SupportContactsList contacts={safeguarding.contacts} />}
      <EvidencePack safeguarding={safeguarding} reference={reference} />
      <ReferralLog safeguarding={safeguarding} />
    </section>
  );
}
