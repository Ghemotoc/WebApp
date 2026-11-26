/**
 * ContactPage: /contact, "Write to us", the Contact us form for users and visitors (story
 * S1-E14-04; DSA art. 12: a contact point for users, by electronic means and user-friendly;
 * GDPR art. 12(2)).
 *
 * Reached from the footer, Settings and the contact and company details page. A line points
 * reports of content to the Report button and the legal contact page (decided 23 Oct 2026, Q10h).
 * After sending: "Message sent" with the reference the emails carry (the reference is made by
 * the function and not stored, Q10c; there is no request list, Q10g).
 * Beside the form sits "Other ways to reach us" (G5b, board Contact).
 * Who shows it: the router. What it calls: useContactForm → api/contact.ts → POST /api/contact,
 * and ContactOtherWays.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';

import { useContactForm } from '../hooks/useContactForm';
import { registerContactTranslations } from '../registerContactTranslations';

import { ContactForm } from './ContactForm';
import { ContactOtherWays } from './ContactOtherWays';
import { writtenLanguageFor } from '@/schemas/interfaceLanguages';

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
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 lg:p-8 shadow-card"
    >
      <h2
        id="contact-sent-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('sent.heading')}
      </h2>
      <p className="m-0 text-ink-muted">{t('sent.body', { reference })}</p>
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
  const language = writtenLanguageFor(i18n.language);
  return (
    <PageContainer className="flex flex-col gap-8 pt-12 pb-6">
      <title>{t('documentTitle')}</title>
      {/* The board's header (J10, bundle 10): the heading and its lead, with no eyebrow. */}
      <div className="flex flex-col gap-2">
        <h1 className="m-0 type-title lg:type-display text-ink-heading">{t('heading')}</h1>
        <p className="m-0 type-body text-ink-muted">{t('intro')}</p>
      </div>
      {/* Reports of content go to the Report button, not here (Q10h); a small note, as drawn. */}
      <p className="m-0 type-meta text-ink-muted">
        {t('reportInstead')}{' '}
        <Link to="/legal/contact" className="text-link underline">
          {t('reportInsteadLink')}
        </Link>
        .
      </p>
      {/* The form, with "Other ways to reach us" beside it on a wide screen and under it on a
          phone (G5b, board Contact). */}
      <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
        <div className="min-w-0 flex-[999_1_560px] lg:max-w-[720px]">
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
        <ContactOtherWays />
      </div>
    </PageContainer>
  );
}
