/**
 * NoticeKindPicker: "What kind of content is it?", the report reasons plus "Removal order from an
 * authority", as one group of chips (story S1-E10-02; board NoticeForm, 7.3).
 *
 * The reasons are the same list and the same words as the Report button (S1-E10-01), so a notice
 * and a report land in the same moderation tiers. The board's "private information" and "scam"
 * chips are not report reasons, so they are left out (noted in the pull request).
 * Who shows it: NoticeForm. What it calls: nothing; it hands the choice back.
 */
import { useTranslation } from 'react-i18next';

import { ChoiceChips, type ChoiceOption } from '@/components/ui/ChoiceChips';
import { registerReportingTranslations } from '@/features/reporting/registerReportingTranslations';
import { noticeReasons } from '@/schemas/notice';

import type { NoticeDraft } from '../lib/noticeDraft';

/** What the picker needs. */
export interface NoticeKindPickerProps {
  kind: NoticeDraft['kind'];
  onChoose: (kind: NonNullable<NoticeDraft['kind']>) => void;
  /** The "choose a kind" message, when Send was pressed without one. */
  errorMessage?: string;
}

/**
 * Finds the chosen kind from a chip's value.
 *
 * @param value - the chip's value
 * @returns the kind, or null for anything else
 */
function kindFromValue(value: string): NonNullable<NoticeDraft['kind']> | null {
  if (value === 'removal_order') return 'removal_order';
  return noticeReasons.find((reason) => reason === value) ?? null;
}

/**
 * Renders the chips.
 *
 * @returns the labelled group, with the error under it when there is one
 */
export function NoticeKindPicker({ kind, onChoose, errorMessage }: NoticeKindPickerProps) {
  const { i18n } = useTranslation();
  // The reason labels live in the reporting texts; they load with this page.
  registerReportingTranslations(i18n);
  const { t } = useTranslation(['notices', 'reporting']);
  const options: ChoiceOption[] = [
    ...noticeReasons.map((reason) => ({
      value: reason,
      label: t(`reporting:reasons.${reason}.label`),
    })),
    { value: 'removal_order', label: t('notices:form.removalOrder') },
  ];
  return (
    <div className="flex flex-col gap-2">
      <ChoiceChips
        label={`${t('notices:form.kind')} (${t('notices:form.required')})`}
        isLabelVisible
        options={options}
        value={kind ?? ''}
        onChange={(value) => {
          const chosen = kindFromValue(value);
          if (chosen !== null) onChoose(chosen);
        }}
        descriptionId={errorMessage === undefined ? undefined : 'notice-kind-error'}
      />
      {/* The group's own description is grey; an error needs the error colour. */}
      {errorMessage !== undefined && (
        <p id="notice-kind-error" className="m-0 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
