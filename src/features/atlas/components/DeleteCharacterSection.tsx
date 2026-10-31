/**
 * DeleteCharacterSection: "Delete this character" at the foot of a sheet (story S1-E17-13:
 * "when I choose Delete, then a second, confirming click is needed"; Story Atlas principle:
 * "Nothing is deleted without a second, confirming click").
 *
 * The first click asks "Delete Ana?" with Yes and Keep; the focus moves to the question so a
 * screen reader hears it. Yes deletes the character and its picture, then the caller closes the
 * sheet. Who uses it: CharacterSheet.
 */
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the section needs. */
export interface DeleteCharacterSectionProps {
  name: string;
  /** Deletes the character; throws when it can't. */
  onDelete: () => Promise<void>;
}

/**
 * Renders the section.
 *
 * @returns the card with Delete, or the question with Yes and Keep
 */
export function DeleteCharacterSection({ name, onDelete }: DeleteCharacterSectionProps) {
  const { t } = useAtlasTranslation();
  const [isAsking, setIsAsking] = useState(false);
  const [failed, setFailed] = useState(false);
  const question = useRef<HTMLParagraphElement>(null);

  // The question takes the focus when it appears, so it is read out.
  useEffect(() => {
    if (isAsking) question.current?.focus();
  }, [isAsking]);

  /** The second click: deletes, or says plainly that it couldn't. */
  async function confirm() {
    setFailed(false);
    await onDelete().catch(() => setFailed(true));
  }

  return (
    <section
      aria-labelledby="atlas-delete-character-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2
        id="atlas-delete-character-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('characters.delete.heading')}
      </h2>
      {!isAsking && (
        <Button variant="destructive" className="self-start" onClick={() => setIsAsking(true)}>
          {t('characters.delete.button')}
        </Button>
      )}
      {isAsking && (
        <>
          <p ref={question} tabIndex={-1} className="m-0 text-body">
            {t('characters.delete.confirm', { name })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="destructive" onClick={() => void confirm()}>
              {t('characters.delete.yes')}
            </Button>
            <Button variant="secondary" onClick={() => setIsAsking(false)}>
              {t('characters.delete.keep', { name })}
            </Button>
          </div>
        </>
      )}
      <div aria-live="polite">
        {failed && <Notice tone="error">{t('characters.delete.failed')}</Notice>}
      </div>
    </section>
  );
}
