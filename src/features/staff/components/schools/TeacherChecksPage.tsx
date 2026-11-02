/**
 * TeacherChecksPage: /staff/schools/teachers, the Teacher badge requests waiting for staff and
 * everyone who has the badge (story S1-E2-11; board AdminSchools 8.9, "Verify teachers").
 *
 * Who shows it: the router, inside StaffLayout. The database lets in only staff with Schools
 * access (owner and admin, and moderators with the teacher checks permission; architecture
 * 1.8.3), and the page says so to anyone else.
 * What it calls: registerModerationTranslations (for ReasonForm), useTeacherChecks →
 * api/teacherChecks.ts. Plain components, no doodles. SchoolsTabs leads to Class spaces
 * (CLASSES-d); licences on the same board come later.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { registerModerationTranslations } from '@/features/moderation/registerModerationTranslations';

import { useTeacherChecks } from '../../hooks/useTeacherChecks';

import { SchoolsTabs } from './SchoolsTabs';

import { TeacherCheckCard } from './TeacherCheckCard';
import { TeachersList } from './TeachersList';

/** useTeacherChecks's result, passed down once. */
type TeacherChecks = ReturnType<typeof useTeacherChecks>;

/**
 * The waiting requests, one card each.
 *
 * @returns the list, or the line saying there is nothing to check
 */
function WaitingRequests({ checks }: { checks: TeacherChecks }) {
  const { t } = useTranslation('staff');
  if (checks.requests.length === 0) {
    return <p className="m-0 text-body">{t('teacherChecks.none')}</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {checks.requests.map((request) => (
        <TeacherCheckCard
          key={request.checkId}
          request={request}
          isBusy={checks.isBusy}
          onOpenProof={checks.openProof}
          onDecide={(decision, reason, proofPath) =>
            checks.decide({ checkId: request.checkId, decision, reason, proofPath })
          }
        />
      ))}
    </ul>
  );
}

/**
 * What goes under the heading: a refusal, an error, or the requests and the teachers.
 *
 * @returns the page's body
 */
function TeacherChecksBody({ checks }: { checks: TeacherChecks }) {
  const { t } = useTranslation('staff');
  if (checks.loadFailure === 'not_allowed') {
    return <p className="m-0 text-body">{t('teacherChecks.notAllowed')}</p>;
  }
  if (checks.loadFailure !== null) {
    return <Notice tone="error">{t(`teacherChecks.failures.${checks.loadFailure}`)}</Notice>;
  }
  if (checks.isLoading) return null;
  return (
    <>
      {checks.actionFailure !== null && (
        <Notice tone="error">{t(`teacherChecks.failures.${checks.actionFailure}`)}</Notice>
      )}
      <WaitingRequests checks={checks} />
      <TeachersList
        teachers={checks.teachers}
        isBusy={checks.isBusy}
        onRemove={(handle, reason) => checks.removeBadge({ handle, reason })}
      />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Verify teachers screen
 */
export function TeacherChecksPage() {
  // The reason forms reuse the moderation feature's ReasonForm, so its texts are added first.
  const { i18n } = useTranslation();
  registerModerationTranslations(i18n);
  const { t } = useTranslation('staff');
  const checks = useTeacherChecks();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('teacherChecks.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('teacherChecks.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('teacherChecks.heading')}
        </h1>
        <p className="m-0 text-body">{t('teacherChecks.intro')}</p>
      </div>
      <SchoolsTabs />
      <div className="flex max-w-[860px] flex-col gap-6">
        <TeacherChecksBody checks={checks} />
      </div>
      <p className="m-0 max-w-[720px] text-sm text-meta">{t('teacherChecks.footer')}</p>
    </PageContainer>
  );
}
