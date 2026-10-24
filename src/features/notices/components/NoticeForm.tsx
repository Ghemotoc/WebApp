/**
 * NoticeForm: the public report form's card: what kind of content it is, then the fields for a
 * notice or for an authority's removal order, and Send (story S1-E10-02; board NoticeForm, 7.3;
 * DSA art. 16; Regulation (EU) 2021/784 art. 15). Needs the lawyer's review before launch.
 *
 * The form checks the answers itself before sending, lists what is wrong next to each field and
 * moves focus to the first one (WCAG 2.2, 3.3.1). /report?kind=removal_order opens it on the order,
 * for the link on the legal contact page. No doodles on reporting screens (DoD).
 * Who shows it: NoticePage. What it calls: the onSend it is given (useNoticeForm).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { brand } from '@/config/brand';
import type { NoticeRequest } from '@/schemas/notice';

import type { NoticeFailure } from '../api/notice';
import {
  emptyNoticeDraft,
  findNoticeProblems,
  toNoticeRequest,
  type NoticeDraft,
  type NoticeField,
  type NoticeProblems,
} from '../lib/noticeDraft';

import { ContentNoticeFields } from './ContentNoticeFields';
import { NoticeKindPicker } from './NoticeKindPicker';
import { RemovalOrderFields } from './RemovalOrderFields';

/** What the form needs. */
export interface NoticeFormProps {
  language: 'ro' | 'en';
  isSending: boolean;
  failure: NoticeFailure | null;
  onSend: (notice: NoticeRequest) => Promise<unknown>;
}

/** The fields in the order they appear, so focus goes to the first one with a problem. */
const fieldOrder: [NoticeField, string][] = [
  ['kind', 'notice-kind-error'],
  ['authorityName', 'notice-authority'],
  ['contentUrl', 'notice-url'],
  ['explanation', 'notice-explanation'],
  ['notifierName', 'notice-name'],
  ['notifierEmail', 'notice-email'],
  ['goodFaith', 'notice-good-faith'],
];

/**
 * Moves focus to the first field with a problem. For the kind, the chosen-chip group itself.
 *
 * @param problems - what is wrong
 */
function focusFirstProblem(problems: NoticeProblems): void {
  const first = fieldOrder.find(([field]) => problems[field] !== undefined);
  if (first === undefined) return;
  if (first[0] === 'kind') {
    document.querySelector<HTMLElement>('#notice-form [role="radiogroup"] [tabindex="0"]')?.focus();
    return;
  }
  document.getElementById(first[1])?.focus();
}

/**
 * The draft as the page opens: on the removal order when the address asks for it.
 *
 * @param askedKind - the ?kind= value, if any
 * @returns the first draft
 */
function firstDraft(askedKind: string | null): NoticeDraft {
  if (askedKind === 'removal_order') return { ...emptyNoticeDraft, kind: 'removal_order' };
  return emptyNoticeDraft;
}

/**
 * Renders the form.
 *
 * @returns the card with the kind, the fields and Send
 */
export function NoticeForm({ language, isSending, failure, onSend }: NoticeFormProps) {
  const { t } = useTranslation('notices');
  const [searchParams] = useSearchParams();
  const [draft, setDraft] = useState<NoticeDraft>(() => firstDraft(searchParams.get('kind')));
  const [problems, setProblems] = useState<NoticeProblems>({});
  // When the form opened, for the server's "faster than a person" check.
  const [openedAt] = useState(() => Date.now());
  const isOrder = draft.kind === 'removal_order';

  /** Checks the answers, then sends; a refusal is shown from useNoticeForm. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = findNoticeProblems(draft);
    setProblems(found);
    if (Object.keys(found).length > 0 || draft.kind === null) {
      focusFirstProblem(found);
      return;
    }
    await onSend(toNoticeRequest({ ...draft, kind: draft.kind }, language, openedAt)).catch(
      () => undefined,
    );
  }

  const change = (patch: Partial<NoticeDraft>) => setDraft((current) => ({ ...current, ...patch }));
  return (
    <form
      id="notice-form"
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby="notice-form-heading"
      className="relative flex flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2 id="notice-form-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
        {t(isOrder ? 'order.heading' : 'form.heading')}
      </h2>
      <NoticeKindPicker
        kind={draft.kind}
        onChoose={(kind) => change({ kind })}
        errorMessage={problems.kind === undefined ? undefined : t('form.problems.kind_missing')}
      />
      {isOrder ? (
        <RemovalOrderFields draft={draft} problems={problems} onChange={change} />
      ) : (
        <ContentNoticeFields draft={draft} problems={problems} onChange={change} />
      )}
      {failure !== null && (
        <Notice tone="error">
          {t(`failures.${failure}`, { supportEmail: brand.supportEmail })}
        </Notice>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={isSending}>
          {t(sendLabelKey(isSending, isOrder))}
        </Button>
        <span className="text-sm text-meta">{t('form.aPersonReads')}</span>
      </div>
    </form>
  );
}

/**
 * The Send button's words.
 *
 * @param isSending - whether a send is under way
 * @param isOrder - whether it is a removal order
 * @returns the key in notices.json
 */
function sendLabelKey(isSending: boolean, isOrder: boolean): string {
  if (isSending) return 'form.sending';
  return isOrder ? 'order.send' : 'form.send';
}
