/**
 * ContentNoticeFields: the fields of a notice about content: the exact link, why it is illegal,
 * the notifier's name and email and the good-faith statement (story S1-E10-02; DSA art. 16(2)).
 *
 * Name and email are required except for child sexual content (DSA art. 16(2)(c)); the labels
 * and the hint under the email change with the chosen kind, so nobody guesses.
 * Who shows it: NoticeForm. What it calls: nothing; changes go back through onChange.
 */
import { useTranslation } from 'react-i18next';

import { TextInput } from '@/components/ui/TextInput';
import { noticeLimits } from '@/schemas/notice';

import { useFieldLabel, useProblemMessage } from '../hooks/useNoticeFieldText';
import { isContactOptional, type NoticeDraft, type NoticeProblems } from '../lib/noticeDraft';

import { ExplanationField, GoodFaithCheckbox, NoticeHoneypot } from './NoticeFieldParts';

/** What the fields need. */
export interface NoticeFieldsProps {
  draft: NoticeDraft;
  problems: NoticeProblems;
  onChange: (change: Partial<NoticeDraft>) => void;
}

/**
 * The name and email, required or optional by the kind.
 *
 * @returns the two fields
 */
function NotifierFields({ draft, problems, onChange }: NoticeFieldsProps) {
  const { t } = useTranslation('notices');
  const labelFor = useFieldLabel();
  const messageFor = useProblemMessage();
  const isRequired = !isContactOptional(draft.kind);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <TextInput
        id="notice-name"
        label={labelFor('form.name', isRequired)}
        autoComplete="name"
        maxLength={noticeLimits.name}
        value={draft.notifierName}
        errorMessage={messageFor(problems.notifierName)}
        onChange={(event) => onChange({ notifierName: event.target.value })}
      />
      <TextInput
        id="notice-email"
        type="email"
        label={labelFor('form.email', isRequired)}
        autoComplete="email"
        maxLength={noticeLimits.email}
        hint={t(isRequired ? 'form.contactHint' : 'form.contactOptionalHint')}
        value={draft.notifierEmail}
        errorMessage={messageFor(problems.notifierEmail)}
        onChange={(event) => onChange({ notifierEmail: event.target.value })}
      />
    </div>
  );
}

/**
 * Renders the notice's fields.
 *
 * @returns the fields, in the board's order
 */
export function ContentNoticeFields({ draft, problems, onChange }: NoticeFieldsProps) {
  const { t } = useTranslation('notices');
  const labelFor = useFieldLabel();
  const messageFor = useProblemMessage();
  return (
    <>
      <TextInput
        id="notice-url"
        type="url"
        inputMode="url"
        label={labelFor('form.contentUrl', true)}
        hint={t('form.contentUrlHint')}
        maxLength={noticeLimits.url}
        value={draft.contentUrl}
        errorMessage={messageFor(problems.contentUrl)}
        onChange={(event) => onChange({ contentUrl: event.target.value })}
      />
      <ExplanationField
        id="notice-explanation"
        label={labelFor('form.explanation', true)}
        hint={t('form.explanationHint')}
        value={draft.explanation}
        errorMessage={messageFor(problems.explanation)}
        onChange={(explanation) => onChange({ explanation })}
      />
      <NotifierFields draft={draft} problems={problems} onChange={onChange} />
      <GoodFaithCheckbox
        isChecked={draft.goodFaith}
        errorMessage={messageFor(problems.goodFaith)}
        onChange={(goodFaith) => onChange({ goodFaith })}
      />
      <NoticeHoneypot value={draft.website} onChange={(website) => onChange({ website })} />
    </>
  );
}
