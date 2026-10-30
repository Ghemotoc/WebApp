/**
 * NewMailPage: /moderator-mail/new, "Write to the moderators" (story S1-E10-11).
 *
 * A subject and a message; when opened from a decision (?decision=S-000012) the message is linked
 * to it, so the team sees which decision it is about. The thread lands in the team's one shared
 * inbox, never with one moderator (criterion 1). Accounts that are suspended can still write.
 * Once sent, the page shows the reference and a link to the thread.
 * Who shows it: the router. What it calls: useSendMail.
 */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { TextInput } from '@/components/ui/TextInput';
import { Textarea } from '@/components/ui/Textarea';
import { useSession } from '@/features/auth/hooks/useSession';

import { mailLimits } from '../api/moderatorMail';
import { useSendMail } from '../hooks/useMyMail';
import { useMailTranslation } from '../registerMailTranslations';

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
      className="flex max-w-[720px] flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      {decision !== null && (
        <p className="m-0 text-body">{t('new.about', { reference: decision })}</p>
      )}
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
      <div aria-live="polite">
        {mail.failure !== null && (
          <Notice tone="error">
            {t(`failures.${mail.failure}`, { minutes: mail.waitMinutes ?? 60 })}
          </Notice>
        )}
      </div>
      <div>
        <Button
          type="submit"
          disabled={mail.isSending || subject.trim() === '' || body.trim() === ''}
        >
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
    <PageContainer className="flex flex-col gap-6 pb-16">
      <title>{t('new.documentTitle')}</title>
      <header className="flex max-w-[720px] flex-col gap-4 pt-14">
        <Eyebrow>{t('eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(32px,4vw,52px)] leading-[1.02] font-extrabold tracking-[-0.025em]">
          {t('new.title')}
        </h1>
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
      <Link to="/moderator-mail" className="w-fit text-sm font-semibold text-link underline">
        {t('back')}
      </Link>
    </PageContainer>
  );
}
