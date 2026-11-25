/**
 * ContactForm: topic, message, email (for a visitor) and Send (story S1-E14-04).
 *
 * Board: none of its own; it follows the public report form's layout (NoticeForm, 7.3): one card,
 * a drop-down for the topic (board J10, bundle 10), a textarea, the "a person reads every message" line. A hidden
 * "website" field is the honeypot (Q10d): real people never see it (it is visually hidden and
 * out of the tab order, and its label says to leave it empty); a bot that fills it gets a
 * reference and nothing is sent. No doodles on contact and reporting screens (DoD).
 * A link can open it with a topic and a first line filled in (/contact?topic=account&message=…),
 * as "Ask a moderator to check it" does for a refused username (S1-E2-04).
 * Who shows it: ContactPage. What it calls: the send() it is given (useContactForm).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { brand } from '@/config/brand';
import {
  contactMessageMaxLength,
  contactRequestSchema,
  contactTopics,
  type ContactRequest,
  type ContactTopic,
} from '@/schemas/contact';

import type { ContactFailure, SenderIdentity } from '../api/contact';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** What the form needs. */
export interface ContactFormProps {
  /** The signed-in person, or null for a visitor. */
  sender: SenderIdentity | null;
  language: 'ro' | 'en';
  isSending: boolean;
  failure: ContactFailure | null;
  onSend: (message: ContactRequest) => Promise<unknown>;
}

/** What is still wrong when Send is pressed. */
type Problem = 'message_missing' | 'message_too_long' | 'email_invalid' | null;

/**
 * The topic as a drop-down with its label above it, as on board J10 (user stories, bundle 10; the
 * radio chips of S1-E14-04 before that). The first topic is picked from the start, so the field is
 * never empty.
 *
 * @returns the drop-down
 */
function TopicSelect({
  chosen,
  onChoose,
}: {
  chosen: ContactTopic;
  onChoose: (topic: ContactTopic) => void;
}) {
  const { t } = useTranslation('contact');
  const options = contactTopics.map((topic) => ({
    value: topic,
    label: t(`form.topics.${topic}`),
  }));
  return (
    <Select
      id="contact-topic"
      label={t('form.topic')}
      isLabelAbove
      options={options}
      value={chosen}
      onChange={(value) => onChoose(contactTopics.find((topic) => topic === value) ?? chosen)}
    />
  );
}

/**
 * What is wrong with the answers, if anything, before they are sent.
 *
 * @returns the first problem, or null
 */
function findProblem(message: string, email: string): Problem {
  if (message.trim() === '') return 'message_missing';
  if (message.trim().length > contactMessageMaxLength) return 'message_too_long';
  if (!contactRequestSchema.shape.email.safeParse(email).success) return 'email_invalid';
  return null;
}

/**
 * The email field for a visitor, or the line saying which account email gets the reply.
 *
 * @returns the field or the line
 */
function SenderField({
  sender,
  email,
  onEmailChange,
  problem,
}: {
  sender: SenderIdentity | null;
  email: string;
  onEmailChange: (email: string) => void;
  problem: Problem;
}) {
  const { t } = useTranslation('contact');
  if (sender !== null) {
    return (
      <p className="m-0 type-meta text-ink-muted">
        {t('form.signedInAs', { email: sender.email, handle: sender.handle ?? '' })}
      </p>
    );
  }
  return (
    <TextInput
      id="contact-email"
      type="email"
      label={t('form.email')}
      hint={t('form.emailHint')}
      errorMessage={problem === 'email_invalid' ? t('form.emailInvalid') : undefined}
      value={email}
      onChange={(event) => onEmailChange(event.target.value)}
    />
  );
}

/**
 * The hidden honeypot field (Q10d): real people never see it, bots fill it. Not display:none,
 * which some bots skip; moved off screen, out of the tab order and hidden from screen readers.
 *
 * @returns the hidden field
 */
function HoneypotField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation('contact');
  return (
    <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
      <label htmlFor="contact-website">{t('form.website')}</label>
      <input
        id="contact-website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * The message field with its error line.
 *
 * @returns the field group
 */
function MessageField({
  message,
  onChange,
  problem,
}: {
  message: string;
  onChange: (message: string) => void;
  problem: Problem;
}) {
  const { t, i18n } = useTranslation('contact');
  const hasProblem = problem === 'message_missing' || problem === 'message_too_long';
  // Locale-aware number, so English reads "4,000" and Romanian "4.000" (DoD: numbers).
  const longestMessage = new Intl.NumberFormat(i18n.language).format(contactMessageMaxLength);
  return (
    <>
      <Textarea
        id="contact-message"
        label={t('form.message')}
        hint={t('form.messageHint', { max: longestMessage })}
        rows={6}
        value={message}
        aria-invalid={hasProblem ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {hasProblem && (
        <p role="alert" className="m-0 type-body text-destructive">
          {t(problem === 'message_missing' ? 'form.messageMissing' : 'form.messageTooLong')}
        </p>
      )}
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the card with the fields and the Send button
 */
export function ContactForm({ sender, language, isSending, failure, onSend }: ContactFormProps) {
  const { t } = useTranslation('contact');
  const [searchParams] = useSearchParams();
  const askedTopic = searchParams.get('topic');
  const [topic, setTopic] = useState<ContactTopic>(
    contactTopics.find((candidate) => candidate === askedTopic) ?? 'question',
  );
  const [message, setMessage] = useState(searchParams.get('message') ?? '');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [problem, setProblem] = useState<Problem>(null);
  const senderEmail = sender?.email ?? email;

  /** Checks the answers, then sends; a refusal is shown from useContactForm. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = findProblem(message, senderEmail);
    setProblem(found);
    if (found !== null) return;
    await onSend({
      topic,
      message: message.trim(),
      email: senderEmail.trim(),
      language,
      handle: sender?.handle ?? undefined,
      userId: sender?.userId,
      website: website === '' ? undefined : website,
    }).catch(errorShownByHook);
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby="contact-form-heading"
      className="relative flex flex-col gap-4 rounded-card border border-border bg-surface p-4 lg:p-8 shadow-card"
    >
      <h2
        id="contact-form-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('form.heading')}
      </h2>
      <TopicSelect chosen={topic} onChoose={setTopic} />
      <MessageField message={message} onChange={setMessage} problem={problem} />
      <SenderField sender={sender} email={email} onEmailChange={setEmail} problem={problem} />
      <HoneypotField value={website} onChange={setWebsite} />
      {failure !== null && (
        <Notice tone="error">
          {t(`failures.${failure}`, { supportEmail: brand.supportEmail })}
        </Notice>
      )}
      {/* Send, then the promise under it in the small meta size, as on the board. */}
      <div className="flex flex-col items-start gap-3">
        <Button type="submit" size="lg" disabled={isSending}>
          {t(isSending ? 'form.sending' : 'form.send')}
        </Button>
        <p className="m-0 type-meta text-ink-muted">{t('form.aPersonReads')}</p>
      </div>
    </form>
  );
}
