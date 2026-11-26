/**
 * NewSupportRequestPage: /support/new, "Ask for help" (story S1-E11-13 criterion 1, the in-app
 * channel; bundle ADMIN-2h1).
 *
 * What it is about, a subject and a message; once sent, the ticket number and a link to it. A
 * line points to 112 and to Report, because a ticket never replaces a report (the story's legal
 * note: the report form stays the contact point for illegal content). Since user stories bundle 10
 * (board J20) the trail "Settings / Support requests / Ask for help" sits on top, the form stands
 * straight on the page with each label above its field, and the 112 and Report note is a warm
 * tinted box beside the form on wide screens (under it on narrow ones). Send comes first and
 * Cancel after it, on the left (DoD, design books item 8; the board's right-hand row is in
 * docs/board-fixes.md).
 * Who shows it: the router. What it calls: useNewSupportRequest.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { ButtonRow } from '@/components/ui/ButtonRow';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMissingField } from '@/lib/forms/useMissingField';

import { supportLimits, ticketCategories, type TicketCategory } from '../api/supportTickets';
import { useNewSupportRequest } from '../hooks/useMySupport';
import { useSupportTranslation } from '../registerSupportTranslations';

import { SignedOutLine } from './SignedOutLine';
import { SupportBreadcrumb } from './SupportBreadcrumb';

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
function SendRow({ isSending }: { isSending: boolean }) {
  const { t } = useSupportTranslation();
  return (
    <ButtonRow>
      <Button type="submit" disabled={isSending}>
        {isSending ? t('new.sending') : t('new.send')}
      </Button>
      <Link
        to="/support"
        className="inline-flex h-11 items-center rounded-full button-glass px-4 type-body font-semibold no-underline"
      >
        {t('new.cancel')}
      </Link>
    </ButtonRow>
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
  // Design books item 9: Send stays pressable and says what is missing beside each field.
  const missingSubject = useMissingField(subject.trim() === '', 'support-subject');
  const missingBody = useMissingField(body.trim() === '', 'support-body');
  if (request.ticketNumber !== null) return <SentNotice ticketNumber={request.ticketNumber} />;

  /** Sends once both fields have words; otherwise says which one is missing. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!missingSubject.isReadyToSend()) return;
    if (!missingBody.isReadyToSend()) return;
    request.send({ subject: subject.trim(), body: body.trim(), category });
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex min-w-0 flex-[999_1_560px] flex-col gap-4 lg:max-w-[720px]"
    >
      <Select
        id="support-category"
        label={t('new.category')}
        isLabelVisible
        isLabelAbove
        placement="form"
        value={category}
        onChange={(value) => setCategory(value as TicketCategory)}
        options={ticketCategories.map((value) => ({ value, label: t(`categories.${value}`) }))}
      />
      <TextInput
        id="support-subject"
        label={t('new.subject')}
        maxLength={supportLimits.subject}
        errorMessage={missingSubject.isShown ? t('new.missingSubject') : undefined}
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
      />
      <Textarea
        id="support-body"
        label={t('new.body')}
        hint={t('new.bodyHint')}
        rows={7}
        maxLength={supportLimits.body}
        errorMessage={missingBody.isShown ? t('new.missingBody') : undefined}
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
      <SendRow isSending={request.isSending} />
    </form>
  );
}

/**
 * The warm note beside the form: 112 for danger, and the report form for anything to report.
 *
 * @returns the aside
 */
function SafetyCard() {
  const { t } = useSupportTranslation();
  return (
    <aside
      aria-labelledby="support-safety-heading"
      className="flex min-w-0 flex-[1_1_280px] flex-col gap-2 rounded-card border border-(--warning-border) bg-(--warning-bg) px-4 py-4 text-(--warning-text) lg:max-w-[360px]"
    >
      <h2 id="support-safety-heading" className="m-0 type-body font-semibold">
        {t('new.safetyHeading')}
      </h2>
      <p className="m-0 type-body">{t('new.safety')}</p>
      <Link to="/report" className="w-fit type-body font-semibold text-(--warning-text) underline">
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
    <PageContainer className="flex flex-col gap-8 pt-8 pb-16">
      <title>{t('new.documentTitle')}</title>
      <SupportBreadcrumb current={t('new.title')} />
      <header className="flex max-w-[720px] flex-col gap-4">
        <h1 className="m-0 type-title lg:type-display">{t('new.title')}</h1>
        <p className="m-0 type-long leading-relaxed text-ink-muted">{t('new.intro')}</p>
      </header>
      {isKnown && userId === null && <SignedOutLine />}
      <div className="flex flex-wrap items-start gap-x-12 gap-y-8">
        {isKnown && userId !== null && <NewRequestForm />}
        <SafetyCard />
      </div>
    </PageContainer>
  );
}
