/**
 * ReportButton: the "Report" action every reportable item shows (story S1-E10-01; CLAUDE.md
 * rule 6: every user-content type has a report button).
 *
 * The one shared component (shared contract between lanes, 23 Oct 2026): a screen that shows a
 * profile, a story, a chapter or later a comment, post, space or message drops it in with the
 * item's type, its reference (a username for a profile, a row ID for anything else) and the words
 * the reporter sees. It opens ReportDialog; nothing else is needed on the screen.
 * Board (Reader): a plain text button "Report" beside Like, Comments and Share; no doodle.
 * Accessible name: "Report @inkwolf" (the item named), so a screen reader knows which Report.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { ReportableType } from '../api/reports';
import { registerReportingTranslations } from '../registerReportingTranslations';

import { ReportDialog } from './ReportDialog';

/** What the button needs. */
export interface ReportButtonProps {
  itemType: ReportableType;
  itemReference: string;
  itemLabel: string;
}

/**
 * Renders the button and its dialog.
 *
 * @returns the button; the dialog opens on press and closes with Cancel, Escape or after sending
 */
export function ReportButton({ itemType, itemReference, itemLabel }: ReportButtonProps) {
  const { t, i18n } = useTranslation();
  registerReportingTranslations(i18n);
  const { t: tReporting } = useTranslation('reporting');
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        variant="text"
        aria-haspopup="dialog"
        aria-label={tReporting('button.label', { item: itemLabel })}
        onClick={() => setIsOpen(true)}
      >
        {t('actions.report')}
      </Button>
      <ReportDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        itemType={itemType}
        itemReference={itemReference}
        itemLabel={itemLabel}
      />
    </>
  );
}
