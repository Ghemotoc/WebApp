/**
 * NewMailPage: /moderator-mail/new, "Write to the moderators" (story S1-E10-11; board ModMailNew in
 * the liquid glass redesign, bundle G8c).
 *
 * As the board draws it: "Moderator mail" to go back, the eyebrow and the title, then one glass
 * card with the linked decision (when there is one), Subject, Message, the line saying a suspended
 * account can still write and where formal appeals go, and Cancel and Send. When opened from a
 * decision (?decision=S-000012) the message is linked to it, so the team sees which decision it
 * is about. The thread lands in the team's one shared inbox, never with one moderator
 * (criterion 1). Once sent, the page shows the reference and a link to the thread.
 * Who shows it: the router. What it calls: useSendMail.
 */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { useSession } from '@/features/auth/hooks/useSession';

import { mailLimits } from '../api/moderatorMail';
import { useSendMail } from '../hooks/useMyMail';
import { useMailTranslation } from '../registerMailTranslations';

import { MailBackLink } from './MailBackLink';

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
    <p className="m-0 flex items-start gap-2 rounded-[16px] border border-border bg-panel px-4 py-3 text-sm text-body">
      <ActionIcon name="info" size={16} className="mt-0.5 shrink-0" />
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
  if (mail.reference !== null) return <SentNotice reference={mail.reference} />;

  /** Sends once both fields have words. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (subject.trim() === '' || body.trim() === '') return;
    mail.send({ subject: subject.trim(), body: body.trim(), statementReference: decision });
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex max-w-[760px] flex-col gap-5 rounded-[28px] border border-border bg-surface p-5 shadow-card md:p-7"
    >
      {decision !== null && <DecisionNote reference={decision} />}
      <TextInput
        id="mail-subject"
        label={t('new.subject')}
        maxLength={mailLimits.subject}
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
      />
      <Textarea
        id="mail-body"
        label={t('new.body')}
        hint={t('new.bodyHint')}
        rows={7}
        maxLength={mailLimits.body}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <p className="m-0 text-[13px] text-meta">{t('new.suspendedNote')}</p>
      <div aria-live="polite">
        {mail.failure !== null && (
          <Notice tone="error">
            {t(`failures.${mail.failure}`, { minutes: mail.waitMinutes ?? 60 })}
          </Notice>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/moderator-mail" className={buttonClassName({ variant: 'secondary' })}>
          {t('new.cancel')}
        </Link>
        <Button
          type="submit"
          disabled={mail.isSending || subject.trim() === '' || body.trim() === ''}
        >
          <ActionIcon name="send" size={16} />
          {mail.isSending ? t('new.sending') : t('new.send')}
        </Button>
      </div>
    </form>
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
    <PageContainer className="flex flex-col gap-6 pt-10 pb-16">
      <title>{t('new.documentTitle')}</title>
      <MailBackLink to="/moderator-mail" label={t('back')} />
      <header className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="page-title">{t('new.title')}</h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('new.intro')}</p>
      </header>
      {isKnown && userId === null && (
        <p className="m-0 text-body">
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
