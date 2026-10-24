/**
 * ChapterPreviewDialog: "Preview", the chapter as readers will see it (story S1-E3-03; board 4.3,
 * the Preview button in the Publish panel).
 *
 * What it shows: the chapter's title and its text drawn by ChapterText, the reader's renderer,
 * so the writer sees exactly what will be published (the draft as saved on screen now). A native
 * <dialog>: focus stays inside, Escape closes it.
 * Who uses it: ChapterEditorPage.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChapterText } from '@/features/reading/components/ChapterText';

/** What the dialog needs. */
export interface ChapterPreviewDialogProps {
  isOpen: boolean;
  title: string;
  /** The body as Markdown, read from the editor when the dialog opens. */
  markdown: string;
  language: string;
  onClose: () => void;
}

/**
 * Renders the dialog.
 *
 * @returns the dialog element (closed when isOpen is false)
 */
export function ChapterPreviewDialog({
  isOpen,
  title,
  markdown,
  language,
  onClose,
}: ChapterPreviewDialogProps) {
  const { t } = useTranslation('editor');
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open and close the native dialog as the prop changes.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="chapter-preview-heading"
      onClose={onClose}
      className="m-auto w-[min(94vw,820px)] rounded-card border border-border bg-surface p-[clamp(20px,4vw,48px)] text-ink shadow-card backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p id="chapter-preview-heading" className="m-0 font-eyebrow text-sm text-eyebrow">
            {t('preview.heading')}
          </p>
          <Button variant="secondary" onClick={onClose}>
            {t('preview.close')}
          </Button>
        </div>
        <p className="m-0 text-[13px] text-meta">{t('preview.note')}</p>
        <h2
          lang={language}
          className="m-0 font-heading text-[clamp(28px,3.4vw,40px)] font-extrabold text-heading"
        >
          {title}
        </h2>
        <ChapterText
          markdown={markdown}
          language={language}
          className="mx-auto w-full max-w-[680px]"
        />
      </div>
    </dialog>
  );
}
