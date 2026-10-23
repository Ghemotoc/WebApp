/**
 * AuditLogPage: /staff/audit-log, where owner and admin search the audit log and export it as CSV
 * (story S1-E11-01; architecture 1.8.3, Audit log: "View and export" for owner and admin, "None"
 * for everyone else).
 *
 * Board: AdminSettings, the "Audit log / Recent changes / Export log" block, given its own page
 * (architecture 1.8.2 proposes one). Plain components, no doodles.
 * Who shows it: the router, inside StaffLayout. The database refuses anyone but owner and admin
 * (admin_search_audit_log()), and the page says so.
 * What it calls: useAuditLog → api/auditLog.ts; the CSV is made by lib/auditLogCsv.ts.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useAuditLog } from '../hooks/useAuditLog';

import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogTable } from './AuditLogTable';

/**
 * The results, the export and the page buttons.
 *
 * @param props.log - useAuditLog's result
 * @returns the body under the form
 */
function AuditLogResults({ log }: { log: ReturnType<typeof useAuditLog> }) {
  const { t } = useTranslation('staff');
  if (log.loadFailure === 'not_allowed') {
    return <p className="m-0 text-body">{t('auditLog.notAllowed')}</p>;
  }
  if (log.loadFailure !== null) {
    return <Notice tone="error">{t(`auditLog.failures.${log.loadFailure}`)}</Notice>;
  }
  if (log.isLoading) return <p className="m-0 text-meta">{t('auditLog.loading')}</p>;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={log.exportCsv} disabled={log.isExporting}>
          {t(log.isExporting ? 'auditLog.exporting' : 'auditLog.export')}
        </Button>
        <span className="text-sm text-meta">{t('auditLog.exportNote')}</span>
      </div>
      {log.exportFailure !== null && (
        <Notice tone="error">{t(`auditLog.failures.${log.exportFailure}`)}</Notice>
      )}
      {log.exportedCount !== null && (
        <Notice tone="success">{t('auditLog.exported', { count: log.exportedCount })}</Notice>
      )}
      <AuditLogTable entries={log.entries} />
      <nav aria-label={t('auditLog.pages')} className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={log.pageNumber === 1}
          onClick={() => log.goToPage(log.pageNumber - 1)}
        >
          {t('auditLog.newer')}
        </Button>
        <span className="text-sm text-meta">{t('auditLog.page', { number: log.pageNumber })}</span>
        <Button
          variant="secondary"
          disabled={!log.hasNextPage}
          onClick={() => log.goToPage(log.pageNumber + 1)}
        >
          {t('auditLog.older')}
        </Button>
      </nav>
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the Audit log screen
 */
export function AuditLogPage() {
  const { t } = useTranslation('staff');
  const log = useAuditLog();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('auditLog.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('auditLog.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('auditLog.heading')}
        </h1>
        <p className="m-0 text-body">{t('auditLog.intro')}</p>
      </div>
      <AuditLogFilters
        filters={log.typedFilters}
        onChange={log.setTypedFilters}
        onSearch={log.search}
      />
      <AuditLogResults log={log} />
    </PageContainer>
  );
}
