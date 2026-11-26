/**
 * ReportButton: the "Report" action every reportable item shows (story S1-E10-01; CLAUDE.md
 * rule 6: every user-content type has a report button).
 *
 * The one shared component (shared contract between lanes, 23 Oct 2026): a screen that shows a
 * profile, a story, a chapter or later a comment, post, space or message drops it in with the
 * item's type, its reference (a username for a profile, a row ID for anything else) and the words
 * the reporter sees. It opens ReportDialog; nothing else is needed on the screen.
 * Board (Reader): a plain text button "Report" beside Like, Comments and Share; no doodle.
 * Looks (bundle G8c, boards Chat and ModMail): `look="pill"` draws a small grey glass pill with a
 * flag and the word, and `look="icon"` a round glass button with only the flag (the chat's
 * per-message Report); the accessible name names the item either way.
 * Accessible name: "Report @inkwolf" (the item named), so a screen reader knows which Report.
 * Size: the button itself carries only two common texts; the dialog and the reporting texts are
 * fetched the first time it is pressed (LoadedReportDialog, split out in S1-E6-03 so the chapter
 * reader stays inside its script budget).
 */
import { lazy, Suspense, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { NavIcon } from '@/components/icons/NavIcon';
import { Button } from '@/components/ui/Button';

import type { ReportableType } from '../api/reports';

/** The dialog with its texts, in its own file, fetched on the first press. */
const LoadedReportDialog = lazy(async () => {
  const module = await import('./LoadedReportDialog');
  return { default: module.LoadedReportDialog };
});

/** What the button needs. */
export interface ReportButtonProps {
  itemType: ReportableType;
  itemReference: string;
  itemLabel: string;
  /**
   * How it looks: underlined words (the default), underlined words after a flag (the story page,
   * board B01), a glass pill, or a round icon button.
   */
  look?: ReportButtonLook;
  /** The visible words, when they say more than "Report" ("Report this story", board B01). */
  visibleLabel?: string;
}

/** The looks of the button (bundle G8c; flaggedText from board B01, bundle 2). */
export type ReportButtonLook = 'text' | 'flaggedText' | 'pill' | 'icon';

/** The Button variant and extra classes for each look. */
const lookStyles: Record<ReportButtonLook, { variant: 'text' | 'secondary'; className: string }> = {
  text: { variant: 'text', className: '' },
  flaggedText: { variant: 'text', className: '' },
  pill: { variant: 'secondary', className: 'h-9 px-4 type-meta' },
  icon: { variant: 'secondary', className: 'size-9 shrink-0 px-0' },
};

/** The longest passage the database keeps (reports_copy_field_lengths). */
const longestPassage = 4000;

/**
 * The text selected on the page, if any.
 *
 * @returns the selection, trimmed and cut to 4,000 characters, or null when nothing is selected
 */
function readSelectedPassage(): string | null {
  const text = window.getSelection()?.toString().trim() ?? '';
  return text === '' ? null : text.slice(0, longestPassage);
}

/**
 * Renders the button and its dialog.
 *
 * @returns the button; the dialog opens on press and closes with Cancel, Escape or after sending
 */
export function ReportButton({
  itemType,
  itemReference,
  itemLabel,
  look = 'text',
  visibleLabel,
}: ReportButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  // The dialog's file is fetched on the first press and then kept, so closing it costs nothing.
  const [hasOpened, setHasOpened] = useState(false);
  // The text the reader had selected when they pressed Report, attached to a copied-work report
  // automatically (S1-E10-08). Read on the press, before the dialog takes focus.
  const [selectedPassage, setSelectedPassage] = useState<string | null>(null);

  // A mouse press can clear the selection before the click lands, so it is read on pointer down too.
  const passageAtPointerDown = useRef<string | null>(null);

  /** Opens the dialog with whatever text is selected on the page. */
  function open() {
    setSelectedPassage(readSelectedPassage() ?? passageAtPointerDown.current);
    passageAtPointerDown.current = null;
    setHasOpened(true);
    setIsOpen(true);
  }

  return (
    <>
      <Button
        variant={lookStyles[look].variant}
        className={lookStyles[look].className}
        aria-haspopup="dialog"
        // Visible words that already say what is reported ("Report this story") are the name, so
        // the name and the label always match (WCAG 2.5.3).
        aria-label={
          visibleLabel === undefined ? t('actions.reportItem', { item: itemLabel }) : undefined
        }
        onPointerDown={() => {
          passageAtPointerDown.current = readSelectedPassage();
        }}
        onClick={open}
      >
        {/* The flag is decorative: the accessible name says what is reported. */}
        {look !== 'text' && <NavIcon name="flag" size={look === 'icon' ? 16 : 14} />}
        {look !== 'icon' && (visibleLabel ?? t('actions.report'))}
      </Button>
      {hasOpened && (
        <Suspense fallback={null}>
          <LoadedReportDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            itemType={itemType}
            itemReference={itemReference}
            itemLabel={itemLabel}
            selectedPassage={selectedPassage}
          />
        </Suspense>
      )}
    </>
  );
}
