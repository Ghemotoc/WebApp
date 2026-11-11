/**
 * NewSupportRequestPage: /support/new, "Ask for help" (story S1-E11-13 criterion 1, the in-app
 * channel; bundle ADMIN-2h1).
 *
 * What it is about, a subject and a message; once sent, the ticket number and a link to it. A
 * line points to 112 and to Report, because a ticket never replaces a report (the story's legal
 * note: the report form stays the contact point for illegal content). In the liquid glass look
 * (bundle G11c, the canvas's SupportNew board) a link back to the list sits on top, the form is a
 * glass card with Cancel beside Send, and the 112 and Report line is a card of its own beside the
 * form on wide screens (under it on narrow ones).
 * Who shows it: the router. What it calls: useNewSupportRequest.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { useSession } from '@/features/auth/hooks/useSession';

import { supportLimits, ticketCategories, type TicketCategory } from '../api/supportTickets';
import { useNewSupportRequest } from '../hooks/useMySupport';
import { useSupportTranslation } from '../registerSupportTranslations';

import { SignedOutLine } from './SignedOutLine';
import { SupportBackLink } from './SupportBackLink';

/**
 * What shows once the request is sent: the number and the way to the ticket.
 *
 * @returns the notice
 */
function SentNotice({ ticketNumber }: { ticketNumber: number }) {
  const { t } = useSupportTranslation();
  return (
    <Notice tone="success">
      {t('new.sent', { number: ticketNumber })}{' '}
      <Link to={`/support/${String(ticketNumber)}`} className="font-semibold underline">
        {t('new.open')}
      </Link>
    </Notice>
  );
}

/**
 * Cancel and Send, at the end of the form, as on the board.
 *
 * @returns the row
 */
function SendRow({ isSending, isIncomplete }: { isSending: boolean; isIncomplete: boolean }) {
  const { t } = useSupportTranslation();
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Link
        to="/support"
        className="inline-flex h-11 items-center rounded-full button-glass px-5 text-sm font-semibold no-underline"
      >
        {t('new.cancel')}
      </Link>
      <Button type="submit" disabled={isSending || isIncomplete}>
        {isSending ? t('new.sending') : t('new.send')}
      </Button>
    </div>
  );
}

/**
 * The form.
 *
 * @returns the form, or the confirmation once sent
 */
function NewRequestForm() {
  const { t } = useSupportTranslation();
  const [category, setCategory] = useState<TicketCategory>('other');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const request = useNewSupportRequest();
  if (request.ticketNumber !== null) return <SentNotice ticketNumber={request.ticketNumber} />;
  const isIncomplete = subject.trim() === '' || body.trim() === '';

  /** Sends once both fields have words. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isIncomplete) return;
    request.send({ subject: subject.trim(), body: body.trim(), category });
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-1 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
    >
      <Select
        id="support-category"
        label={t('new.category')}
        isLabelVisible
        placement="form"
        value={category}
        onChange={(value) => setCategory(value as TicketCategory)}
        options={ticketCategories.map((value) => ({ value, label: t(`categories.${value}`) }))}
      />
      <TextInput
        id="support-subject"
        label={t('new.subject')}
        maxLength={supportLimits.subject}
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
      />
      <Textarea
        id="support-body"
        label={t('new.body')}
        hint={t('new.bodyHint')}
        rows={7}
        maxLength={supportLimits.body}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <div aria-live="polite">
        {request.failure !== null && (
          <Notice tone="error">
            {t(`failures.${request.failure}`, { minutes: request.waitMinutes ?? 60 })}
          </Notice>
        )}
      </div>
      <SendRow isSending={request.isSending} isIncomplete={isIncomplete} />
    </form>
  );
}

/**
 * The card beside the form: 112 for danger, and the report form for anything to report.
 *
 * @returns the aside
 */
function SafetyCard() {
  const { t } = useSupportTranslation();
  return (
    <aside
      aria-labelledby="support-safety-heading"
      className="flex flex-col gap-1.5 rounded-card border border-border bg-surface px-6 py-5 shadow-card lg:w-[320px] lg:flex-none"
    >
      <h2 id="support-safety-heading" className="m-0 text-base font-bold text-heading">
        {t('new.safetyHeading')}
      </h2>
      <p className="m-0 text-sm text-meta">{t('new.safety')}</p>
      <Link to="/report" className="w-fit text-sm font-semibold text-link underline">
        {t('list.reportLink')}
      </Link>
    </aside>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function NewSupportRequestPage() {
  const { t } = useSupportTranslation();
  const { userId, isKnown } = useSession();
  return (
    <PageContainer className="flex flex-col gap-6 pt-8 pb-16">
      <title>{t('new.documentTitle')}</title>
      <SupportBackLink to="/support" label={t('list.title')} />
      <header className="flex max-w-[720px] flex-col gap-4">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(32px,4vw,52px)] leading-[1.02] font-extrabold tracking-[-0.025em]">
          {t('new.title')}
        </h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('new.intro')}</p>
      </header>
      {isKnown && userId === null && <SignedOutLine />}
      <div className="flex flex-col items-start gap-6 lg:flex-row">
        {isKnown && userId !== null && <NewRequestForm />}
        <SafetyCard />
      </div>
    </PageContainer>
  );
}
