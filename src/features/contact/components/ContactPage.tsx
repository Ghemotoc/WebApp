/**
 * ContactPage: /contact, "Write to us", the Contact us form for users and visitors (story
 * S1-E14-04; DSA art. 12: a contact point for users, by electronic means and user-friendly;
 * GDPR art. 12(2)).
 *
 * Reached from the footer, Settings and the contact and company details page. A line points
 * reports of content to the Report button and the legal contact page (decided 23 Oct 2026, Q10h).
 * After sending: "Message sent" with the reference the emails carry (the reference is made by
 * the function and not stored, Q10c; there is no request list, Q10g).
 * Who shows it: the router. What it calls: useContactForm → api/contact.ts → POST /api/contact.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

import { useContactForm } from '../hooks/useContactForm';
import { registerContactTranslations } from '../registerContactTranslations';

import { ContactForm } from './ContactForm';

/**
 * "Message sent", with the reference and a way to write again.
 *
 * @returns the confirmation panel
 */
function MessageSent({ reference, onAgain }: { reference: string; onAgain: () => void }) {
  const { t } = useTranslation('contact');
  return (
    <section
      role="status"
      aria-labelledby="contact-sent-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2 id="contact-sent-heading" className="m-0 font-heading text-[26px] font-bold text-heading">
        {t('sent.heading')}
      </h2>
      <p className="m-0 text-body">{t('sent.body', { reference })}</p>
      <div>
        <Button variant="secondary" onClick={onAgain}>
          {t('sent.again')}
        </Button>
      </div>
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the Contact us screen
 */
export function ContactPage() {
  const { i18n } = useTranslation();
  registerContactTranslations(i18n);
  const { t } = useTranslation('contact');
  const form = useContactForm();
  const language = i18n.language === 'en' ? 'en' : 'ro';
  return (
    <PageContainer className="flex flex-col gap-8 pt-12 pb-7">
      <title>{t('documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-3">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,4vw,52px)] leading-[1.02] font-extrabold tracking-[-0.02em] text-heading">
          {t('heading')}
        </h1>
        <p className="m-0 text-lg leading-[1.6] text-body">{t('intro')}</p>
        {/* Reports of content go to the Report button, not here (Q10h). */}
        <p className="m-0 text-body">
          {t('reportInstead')}{' '}
          <Link to="/legal/contact" className="text-link underline">
            {t('reportInsteadLink')}
          </Link>
          .
        </p>
      </div>
      <div className="max-w-[760px]">
        {form.reference !== null ? (
          <MessageSent reference={form.reference} onAgain={form.reset} />
        ) : (
          form.isSenderKnown && (
            <ContactForm
              sender={form.sender ?? null}
              language={language}
              isSending={form.isSending}
              failure={form.failure}
              onSend={form.send}
            />
          )
        )}
      </div>
    </PageContainer>
  );
}
