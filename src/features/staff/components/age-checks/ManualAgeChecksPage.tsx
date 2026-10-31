/**
 * ManualAgeChecksPage: /staff/users/age-checks, the open manual age checks (story S1-E2-08, part
 * 08b; board AdminUsers 8.5, the manual age checks panel, as a tab under Users; board-fixes:
 * "Manual age checks panel showing the year of birth with the age group").
 *
 * Who shows it: the router, inside StaffLayout. The database refuses anyone but owner, admin and
 * moderator (admin_manual_age_checks()), and the page says so.
 * What it calls: registerModerationTranslations (for ReasonForm), useManualAgeChecks →
 * api/manualAgeChecks.ts. Opening the page logs each year of birth shown. Plain components, no
 * doodles.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { registerModerationTranslations } from '@/features/moderation/registerModerationTranslations';

import { useManualAgeChecks } from '../../hooks/useManualAgeChecks';
import { UsersTabs } from '../users/UsersTabs';

import { ManualAgeCheckCard } from './ManualAgeCheckCard';

/** useManualAgeChecks's result, passed down once. */
type ManualChecks = ReturnType<typeof useManualAgeChecks>;

/**
 * What goes under the heading: a refusal, an error, nothing to do, or the requests.
 *
 * @returns the page's body
 */
function ManualChecksBody({ checks }: { checks: ManualChecks }) {
  const { t } = useTranslation('staff');
  if (checks.loadFailure === 'not_allowed') {
    return <p className="m-0 text-body">{t('manualChecks.notAllowed')}</p>;
  }
  if (checks.loadFailure !== null) {
    return <Notice tone="error">{t(`manualChecks.failures.${checks.loadFailure}`)}</Notice>;
  }
  if (checks.isLoading) return null;
  if (checks.requests.length === 0)
    return <p className="m-0 text-body">{t('manualChecks.none')}</p>;
  return (
    <>
      {checks.decideFailure !== null && (
        <Notice tone="error">{t(`manualChecks.failures.${checks.decideFailure}`)}</Notice>
      )}
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {checks.requests.map((request) => (
          <ManualAgeCheckCard
            key={request.requestId}
            request={request}
            isDeciding={checks.isDeciding}
            onDecide={(decision, reason) =>
              checks.decide({ requestId: request.requestId, decision, reason })
            }
          />
        ))}
      </ul>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the manual age checks screen
 */
export function ManualAgeChecksPage() {
  // The decision form reuses the moderation feature's ReasonForm, so its texts are added first.
  const { i18n } = useTranslation();
  registerModerationTranslations(i18n);
  const { t } = useTranslation('staff');
  const checks = useManualAgeChecks();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('manualChecks.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('manualChecks.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('manualChecks.heading')}
        </h1>
        <p className="m-0 text-body">{t('manualChecks.intro')}</p>
      </div>
      <UsersTabs />
      <div className="flex max-w-[860px] flex-col gap-4">
        <ManualChecksBody checks={checks} />
      </div>
    </PageContainer>
  );
}
