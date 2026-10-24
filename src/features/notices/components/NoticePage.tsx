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

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

import { useNoticeForm } from '../hooks/useNoticeForm';
import { registerNoticeTranslations } from '../registerNoticeTranslations';

import { NoticeForm } from './NoticeForm';
import { NoticeReceived } from './NoticeReceived';
import { NoticeSideColumn } from './NoticeSideColumn';

/**
 * The page's title block: eyebrow, heading, intro and the contact-point line.
 *
 * @returns the header
 */
function NoticeHeader() {
  const { t } = useTranslation('notices');
  return (
    <div className="flex max-w-[760px] flex-col gap-3">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h1 className="m-0 font-heading text-[clamp(32px,4vw,52px)] leading-[1.02] font-extrabold tracking-[-0.02em] text-heading">
        {t('heading')}
      </h1>
      <p className="m-0 text-lg leading-[1.6] text-body">{t('intro')}</p>
      <p className="m-0 text-body">{t('contactPoint')}</p>
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
  const language = i18n.language === 'en' ? 'en' : 'ro';
  return (
    <PageContainer className="flex flex-col gap-8 pt-12 pb-7">
      <title>{t('documentTitle')}</title>
      <NoticeHeader />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 lg:flex-[999_1_620px]">
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
        <aside className="min-w-0 lg:max-w-[380px] lg:flex-[1_1_320px]">
          <NoticeSideColumn />
        </aside>
      </div>
    </PageContainer>
  );
}
