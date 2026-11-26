/**
 * NoticePage: /report, "Report illegal content": the one public report form for anyone, with or
 * without an account, and our contact point for authorities' removal orders (story S1-E10-02;
 * board NoticeForm, 7.3; DSA art. 11, 12 and 16; Regulation (EU) 2021/784 art. 15). Needs the
 * lawyer's review before launch.
 *
 * Reached from the footer ("Report content") and the legal contact page. Two columns on wide
 * screens (the form, then the side column), one under the other on phones.
 * Who shows it: the router (loaded when opened). What it calls: useNoticeForm → api/notice.ts →
 * POST /api/notice → server/notice.ts → submit_public_notice().
 */
import { useTranslation } from 'react-i18next';

import { PageContainer } from '@/components/ui/PageContainer';

import { useNoticeForm } from '../hooks/useNoticeForm';
import { registerNoticeTranslations } from '../registerNoticeTranslations';

import { NoticeForm } from './NoticeForm';
import { NoticeReceived } from './NoticeReceived';
import { NoticeSideColumn } from './NoticeSideColumn';
import { writtenLanguageFor } from '@/schemas/interfaceLanguages';

/**
 * The page's title block, as on board J11 (bundle 10): the heading and its lead with no eyebrow,
 * then the contact-point line for authorities in the small meta size.
 *
 * @returns the header
 */
function NoticeHeader() {
  const { t } = useTranslation('notices');
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 type-title lg:type-display text-ink-heading">{t('heading')}</h1>
        <p className="m-0 type-body text-ink-muted">{t('intro')}</p>
      </div>
      <p className="m-0 max-w-none type-meta text-ink-muted">{t('contactPoint')}</p>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the report form screen
 */
export function NoticePage() {
  const { i18n } = useTranslation();
  registerNoticeTranslations(i18n);
  const { t } = useTranslation('notices');
  const form = useNoticeForm();
  const language = writtenLanguageFor(i18n.language);
  return (
    <PageContainer className="flex flex-col gap-8 pt-12 pb-6">
      <title>{t('documentTitle')}</title>
      <NoticeHeader />
      <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
        <div className="min-w-0 flex-[999_1_560px] lg:max-w-[720px]">
          {form.answer !== null && form.sent !== null ? (
            <NoticeReceived
              sent={form.sent}
              answer={form.answer}
              language={language}
              onAgain={form.reset}
            />
          ) : (
            <NoticeForm
              language={language}
              isSending={form.isSending}
              failure={form.failure}
              onSend={form.send}
            />
          )}
        </div>
        <aside className="min-w-0 flex-[1_1_260px] lg:max-w-[360px]">
          <NoticeSideColumn />
        </aside>
      </div>
    </PageContainer>
  );
}
