/**
 * RenameChapterForm: the row's title turned into a field with Save and Cancel (story S1-E3-04;
 * board 4.4, "New title for chapter n").
 *
 * Rules: the title keeps the editor's limit (120 characters, S1-E3-02a); the database tidies
 * spaces and Romanian letters and, for a published chapter, readers see the new title at once.
 * Escape cancels. Focus goes into the field when it opens.
 * Who uses it: ManagedChapterRow. What it calls: onSave, which the row turns into
 * rename_chapter() through useManageChapters.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { MAXIMUM_CHAPTER_TITLE_LENGTH } from '@/schemas/chapter';

/** What the form needs. */
export interface RenameChapterFormProps {
  code: string;
  number: number;
  title: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}

/**
 * Renders the field and its two buttons.
 *
 * @returns the form
 */
export function RenameChapterForm({
  code,
  number,
  title,
  onSave,
  onCancel,
}: RenameChapterFormProps) {
  const { t } = useTranslation('writing');
  const [newTitle, setNewTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `rename-${code}`;

  // Put the cursor in the field, with the old title selected so typing replaces it.
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(newTitle);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {t('manageChapters.renameLabel', { number })}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        value={newTitle}
        maxLength={MAXIMUM_CHAPTER_TITLE_LENGTH}
        onChange={(event) => setNewTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
        className="h-11 min-w-0 flex-[1_1_220px] rounded-full border border-link bg-surface px-4 font-heading text-[17px] font-bold text-ink"
      />
      <Button type="submit">{t('manageChapters.save')}</Button>
      <Button variant="text" className="px-3.5 no-underline" onClick={onCancel}>
        {t('manageChapters.cancel')}
      </Button>
    </form>
  );
}
