/**
 * RemovalOrderFields: the fields of an authority's removal order: the issuing authority, the
 * order's reference, the exact link, the order or a summary and an email for the acknowledgement
 * (story S1-E10-02; Regulation (EU) 2021/784 art. 3 and 15). Needs the lawyer's review before
 * launch.
 *
 * No good-faith box and no bot check: an order must never be blocked on its way in.
 * Who shows it: NoticeForm. What it calls: nothing; changes go back through onChange.
 */
import { useTranslation } from 'react-i18next';

import { TextInput } from '@/components/ui/TextInput';
import { noticeLimits } from '@/schemas/notice';

import { useFieldLabel, useProblemMessage } from '../hooks/useNoticeFieldText';

import { ExplanationField } from './NoticeFieldParts';
import type { NoticeFieldsProps } from './ContentNoticeFields';

/**
 * Renders the order's fields.
 *
 * @returns the intro line and the fields
 */
export function RemovalOrderFields({ draft, problems, onChange }: NoticeFieldsProps) {
  const { t } = useTranslation('notices');
  const labelFor = useFieldLabel();
  const messageFor = useProblemMessage();
  return (
    <>
      <p className="m-0 text-[15px] text-body">{t('order.intro')}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          id="notice-authority"
          label={labelFor('order.authority', true)}
          autoComplete="organization"
          maxLength={noticeLimits.authority}
          value={draft.authorityName}
          errorMessage={messageFor(problems.authorityName)}
          onChange={(event) => onChange({ authorityName: event.target.value })}
        />
        <TextInput
          id="notice-order-reference"
          label={labelFor('order.orderReference', false)}
          maxLength={noticeLimits.orderReference}
          value={draft.orderReference}
          onChange={(event) => onChange({ orderReference: event.target.value })}
        />
      </div>
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
        label={labelFor('order.orderText', true)}
        hint={t('order.orderTextHint')}
        value={draft.explanation}
        errorMessage={messageFor(problems.explanation)}
        onChange={(explanation) => onChange({ explanation })}
      />
      <TextInput
        id="notice-email"
        type="email"
        label={labelFor('order.email', true)}
        autoComplete="email"
        maxLength={noticeLimits.email}
        hint={t('order.emailHint')}
        value={draft.notifierEmail}
        errorMessage={messageFor(problems.notifierEmail)}
        onChange={(event) => onChange({ notifierEmail: event.target.value })}
      />
    </>
  );
}
