/**
 * SignatureWordsForm: the signature's words in Settings, with live counts of characters and lines
 * (story S1-E8-08 criterion 1: at most 300 characters and three lines; board 6.3).
 *
 * The counts are announced politely as the person types; Save is refused early when a limit is
 * passed, and the database checks the same limits (set_my_signature()). Saving keeps the current
 * picture. Clearing the words and saving takes them off.
 * Who uses it: SignatureSettingsSection. What it calls: useSignatureChange().save.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import { signatureMaxLength, signatureMaxLines } from '../api/forumSignatures';
import { signatureFailureOf, type useSignatureChange } from '../hooks/useForumSignatures';
import { countSignature } from '../lib/signatureLimits';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the form needs. */
export interface SignatureWordsFormProps {
  savedText: string;
  pictureId: string | null;
  /** Kept by the section, so "Saved." survives the form starting again with the new words. */
  save: ReturnType<typeof useSignatureChange>['save'];
}

/**
 * The line under the field: the counts, or which limit is passed.
 *
 * @returns the key and its values
 */
function countMessage(text: string): {
  key: string;
  isOver: boolean;
  values: Record<string, number>;
} {
  const count = countSignature(text);
  const values = {
    count: count.characters,
    max: signatureMaxLength,
    lines: count.lines,
    maxLines: signatureMaxLines,
  };
  if (count.isTooLong) return { key: 'signature.tooLong', isOver: true, values };
  if (count.hasTooManyLines) return { key: 'signature.tooManyLines', isOver: true, values };
  return { key: 'signature.count', isOver: false, values };
}

/**
 * Renders the form.
 *
 * @returns the field, its counts, the save button and what happened
 */
export function SignatureWordsForm({ savedText, pictureId, save }: SignatureWordsFormProps) {
  const { t } = useForumsTranslation();
  const [text, setText] = useState(savedText);
  const message = countMessage(text);
  const failure = signatureFailureOf(save.error);

  /** Saves the words with the current picture, unless a limit is passed (the field says so). */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!message.isOver) save.mutate({ text, pictureId });
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <Textarea
        id="settings-signature"
        label={t('signature.wordsLabel')}
        hint={t('signature.wordsHint', { max: signatureMaxLength, maxLines: signatureMaxLines })}
        rows={3}
        value={text}
        aria-invalid={message.isOver ? true : undefined}
        onChange={(event) => {
          save.reset();
          setText(event.target.value);
        }}
      />
      <p
        aria-live="polite"
        className={`m-0 text-[13px] ${message.isOver ? 'text-destructive' : 'text-meta'}`}
      >
        {t(message.key, message.values)}
      </p>
      {failure !== null && <Notice tone="error">{t(`signature.failed.${failure.failure}`)}</Notice>}
      {save.isSuccess && <Notice tone="success">{t('signature.saved')}</Notice>}
      <div>
        <Button
          type="submit"
          variant="secondary"
          disabled={save.isPending || text.trim() === savedText}
        >
          {save.isPending ? t('signature.saving') : t('signature.save')}
        </Button>
      </div>
    </form>
  );
}
