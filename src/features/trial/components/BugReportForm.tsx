/**
 * BugReportForm: what the tester fills in inside the "Report a bug" panel (TRIAL-FEEDBACK;
 * board J31): what it is (Something broke, Something looks wrong, An idea), what happened, the
 * line saying what else we send, and Send and Cancel.
 *
 * The main button stays pressable; pressed with nothing typed, it says what is missing beside the
 * field and puts the focus there (design books item 9).
 * Who uses it: BugReportPanel. What it calls: ChoiceChips, Textarea and Button.
 * Send stays disabled until something is written. If sending fails, the words stay in the box and
 * a plain line says to try again (board J31's note: a failure keeps the text).
 */
import { useId, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Textarea } from '@/components/ui/Textarea';
import { useMissingField } from '@/lib/forms/useMissingField';
import { bugReportKinds, contactMessageMaxLength, type BugReportKind } from '@/schemas/contact';

import type { BugReportDraft } from '../hooks/useBugReport';
import { useTrialTranslation } from '../registerTrialTranslations';

/** What the form needs from the panel. */
interface BugReportFormProps {
  isSending: boolean;
  hasFailed: boolean;
  onSend: (draft: BugReportDraft) => void;
  onCancel: () => void;
}

/**
 * Says whether a value is one of the three kinds.
 *
 * @param value - the chosen chip's value
 * @returns true for 'broke', 'looks_wrong' or 'idea'
 */
function isBugReportKind(value: string): value is BugReportKind {
  return bugReportKinds.some((kind) => kind === value);
}

/**
 * The form.
 *
 * @returns the chips, the box, the line and the two buttons
 */
export function BugReportForm({ isSending, hasFailed, onSend, onCancel }: BugReportFormProps) {
  const { t } = useTrialTranslation();
  const messageId = useId();
  const [kind, setKind] = useState<BugReportKind>('broke');
  const [message, setMessage] = useState('');
  // Design books item 9: Send stays pressable and says what is missing beside the box.
  const missing = useMissingField(message.trim() === '', messageId);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (missing.isReadyToSend()) onSend({ kind, message: message.trim() });
      }}
    >
      <ChoiceChips
        label={t('bugReport.kindLabel')}
        options={bugReportKinds.map((value) => ({ value, label: t(`bugReport.kinds.${value}`) }))}
        value={kind}
        onChange={(value) => {
          if (isBugReportKind(value)) setKind(value);
        }}
      />
      <Textarea
        id={messageId}
        label={t('bugReport.message')}
        rows={5}
        maxLength={contactMessageMaxLength}
        errorMessage={missing.isShown ? t('bugReport.missing') : undefined}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <p className="m-0 type-meta text-meta">{t('bugReport.whatWeSend')}</p>
      {hasFailed && (
        <p role="alert" className="m-0 type-meta text-destructive">
          {t('bugReport.unsent')}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" isLoading={isSending}>
          {t('bugReport.send')}
        </Button>
        <Button variant="text" onClick={onCancel}>
          {t('bugReport.cancel')}
        </Button>
      </div>
    </form>
  );
}
