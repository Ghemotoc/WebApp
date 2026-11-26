/**
 * NewMailPage: /moderator-mail/new, "Write to the moderators" (story S1-E10-11; board ModMailNew in
 * the liquid glass redesign, bundle G8c; user stories bundle 10, board J23).
 *
 * Board J23: the trail "Settings / Moderator mail / Write to the moderators", the title and lead,
 * then the form straight on the page with the linked decision (when there is one), Subject, Message, the line saying a suspended
 * account can still write and where formal appeals go, and Cancel and Send. When opened from a
 * decision (?decision=S-000012) the message is linked to it, so the team sees which decision it
 * is about. The thread lands in the team's one shared inbox, never with one moderator
 * (criterion 1). Once sent, the page shows the reference and a link to the thread.
 * Send stays pressable; pressed with a field empty, it says which one beside it and puts the
 * focus there (design books item 9). Send comes first, then Cancel (item 8).
 * Who shows it: the router. What it calls: useSendMail.
 */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { useSession } from '@/features/auth/hooks/useSession';
import { useMissingField } from '@/lib/forms/useMissingField';

import { mailLimits } from '../api/moderatorMail';
import { useSendMail } from '../hooks/useMyMail';
import { useMailTranslation } from '../registerMailTranslations';

import { MailBreadcrumb } from './MailBreadcrumb';

/** A decision reference from the address, or null when it doesn't look like one. */
function decisionFrom(value: string | null): string | null {
  return value !== null && /^S-\d{6}$/.test(value) ? value : null;
}

/**
 * What shows once the message is sent: the reference and the way to the thread.
 *
 * @returns the notice
 */
function SentNotice({ reference }: { reference: string }) {
  const { t } = useMailTranslation();
  return (
    <Notice tone="success">
      {t('new.sent', { reference })}{' '}
      <Link to={`/moderator-mail/${reference}`} className="font-semibold underline">
        {t('new.open')}
      </Link>
    </Notice>
  );
}

/**
 * The note at the top of the form when the message is about a decision.
 *
 * @param props.reference - the decision's reference ("S-000418")
 * @returns the note
 */
function DecisionNote({ reference }: { reference: string }) {
  const { t } = useMailTranslation();
  return (
    <p className="m-0 flex items-start gap-2 rounded-field border border-border bg-panel px-4 py-3 type-body text-ink-muted">
      <ActionIcon name="info" size={16} className="mt-1 shrink-0" />
      <span>{t('new.about', { reference })}</span>
    </p>
  );
}

/**
 * The form.
 *
 * @returns the form, or the confirmation once sent
 */
function NewMailForm({ decision }: { decision: string | null }) {
  const { t } = useMailTranslation();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const mail = useSendMail();
  // Design books item 9: Send stays pressable and says what is missing beside each field.
  const missingSubject = useMissingField(subject.trim() === '', 'mail-subject');
  const missingBody = useMissingField(body.trim() === '', 'mail-body');
  if (mail.reference !== null) return <SentNotice reference={mail.reference} />;

  /** Sends once both fields have words; otherwise says which one is missing. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!missingSubject.isReadyToSend()) return;
    if (!missingBody.isReadyToSend()) return;
    mail.send({ subject: subject.trim(), body: body.trim(), statementReference: decision });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex max-w-[720px] flex-col gap-4">
      {decision !== null && <DecisionNote reference={decision} />}
      <TextInput
        id="mail-subject"
        label={t('new.subject')}
        maxLength={mailLimits.subject}
        errorMessage={missingSubject.isShown ? t('new.missingSubject') : undefined}
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
      />
      <Textarea
        id="mail-body"
        label={t('new.body')}
        hint={t('new.bodyHint')}
        rows={7}
        maxLength={mailLimits.body}
        errorMessage={missingBody.isShown ? t('new.missingBody') : undefined}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <p className="m-0 type-meta text-ink-muted">{t('new.suspendedNote')}</p>
      <div aria-live="polite">
        {mail.failure !== null && (
          <Notice tone="error">
            {t(`failures.${mail.failure}`, { minutes: mail.waitMinutes ?? 60 })}
          </Notice>
        )}
      </div>
      <SendRow isSending={mail.isSending} />
    </form>
  );
}

/**
 * Send, then Cancel (design books item 8: main button first, on the left).
 *
 * @param props.isSending - true while the mail is on its way; Send is off only then
 * @returns the row
 */
function SendRow({ isSending }: { isSending: boolean }) {
  const { t } = useMailTranslation();
  return (
    <ButtonRow>
      <Button type="submit" disabled={isSending}>
        <ActionIcon name="send" size={16} />
        {isSending ? t('new.sending') : t('new.send')}
      </Button>
      <Link to="/moderator-mail" className={buttonClassName({ variant: 'secondary' })}>
        {t('new.cancel')}
      </Link>
    </ButtonRow>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function NewMailPage() {
  const { t } = useMailTranslation();
  const { userId, isKnown } = useSession();
  const [searchParams] = useSearchParams();
  return (
    <PageContainer className="flex flex-col gap-8 pt-8 pb-16">
      <title>{t('new.documentTitle')}</title>
      <MailBreadcrumb current={t('new.title')} />
      <header className="flex max-w-[720px] flex-col gap-4">
        <h1 className="page-title">{t('new.title')}</h1>
        <p className="m-0 type-long leading-relaxed text-ink-muted">{t('new.intro')}</p>
      </header>
      {isKnown && userId === null && (
        <p className="m-0 text-ink-muted">
          {t('signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('logIn')}
          </Link>
        </p>
      )}
      {isKnown && userId !== null && (
        <NewMailForm decision={decisionFrom(searchParams.get('decision'))} />
      )}
    </PageContainer>
  );
}
