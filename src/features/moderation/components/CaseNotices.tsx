/**
 * CaseNotices: "From the public form", the notices and removal orders the public report form
 * added to a case (story S1-E10-02; DSA art. 16; Regulation (EU) 2021/784). Needs the lawyer's
 * review before launch.
 *
 * Each shows its reference, the reason (or the authority and the order's reference), the address
 * exactly as sent, the explanation and who sent it. The notifier's name and email are shown
 * because the decision email goes to them (S1-E10-04). The address is plain text, never a link,
 * so nobody opens possibly illegal content by accident. Nothing shows for a case without notices.
 * Who shows it: CasePage. What it calls: useCaseNotices.
 */
import { useTranslation } from 'react-i18next';

import type { CaseNotice } from '../api/publicNotices';
import { useCaseNotices } from '../hooks/usePublicNotices';

/**
 * The notice's first line: the reason, or "Removal order from <authority>".
 *
 * @returns the line's text
 */
function useNoticeTitle() {
  const { t } = useTranslation('moderation');
  return (notice: CaseNotice) =>
    notice.kind === 'removal_order'
      ? t('notices.orderFrom', {
          authority: notice.authorityName ?? '',
          orderReference: notice.orderReference ?? t('notices.noOrderReference'),
        })
      : t(`reasons.${notice.reason ?? 'other'}`);
}

/**
 * One notice.
 *
 * @returns a list item
 */
function NoticeCard({ notice }: { notice: CaseNotice }) {
  const { t, i18n } = useTranslation('moderation');
  const titleOf = useNoticeTitle();
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(notice.receivedAt));
  const sender =
    notice.notifierEmail === null
      ? t('notices.anonymous')
      : `${notice.notifierName ?? ''} <${notice.notifierEmail}>`.trim();
  return (
    <li className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <p className="m-0 font-semibold text-heading">{titleOf(notice)}</p>
      <p className="m-0 text-sm text-meta">
        {t('notices.received', { reference: notice.reference, when, language: notice.language })}
      </p>
      <p className="m-0 text-sm text-body">
        <span className="font-semibold">{t('notices.address')}: </span>
        <code className="break-all">{notice.contentUrl}</code>
      </p>
      <blockquote className="m-0 border-l-4 border-(--pill-gold-border) pl-3 text-body whitespace-pre-line">
        {notice.explanation}
      </blockquote>
      <p className="m-0 text-sm text-body">
        <span className="font-semibold">{t('notices.sentBy')}: </span>
        {sender}
      </p>
    </li>
  );
}

/**
 * Renders the section, or nothing when the case has no notices.
 *
 * @param props.caseId - the case
 * @returns the section
 */
export function CaseNotices({ caseId }: { caseId: string }) {
  const { t } = useTranslation('moderation');
  const { notices } = useCaseNotices(caseId);
  if (notices.length === 0) return null;
  return (
    <section aria-labelledby="case-notices-heading" className="flex flex-col gap-4">
      <h2 id="case-notices-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
        {t('notices.caseHeading')}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {notices.map((notice) => (
          <NoticeCard key={notice.reference} notice={notice} />
        ))}
      </ul>
    </section>
  );
}
