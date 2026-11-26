/**
 * NoticeKindPicker: "What kind of content is it?", the report reasons plus "Removal order from an
 * authority", as one drop-down with its label above it (story S1-E10-02; board J11 of the user
 * stories, bundle 10, which replaced the chips of board 7.3). It opens on "Pick one", so nothing is
 * chosen for the person; Send then says the kind is missing beside it (design books item 9).
 *
 * The reasons are the same list and the same words as the Report button (S1-E10-01), so a notice
 * and a report land in the same moderation tiers. The board's "private information" and "scam"
 * chips are not report reasons, so they are left out (noted in the pull request).
 * Who shows it: NoticeForm. What it calls: nothing; it hands the choice back.
 */
import { useTranslation } from 'react-i18next';

import { Select, type SelectOption } from '@/components/ui/Select';
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
 * Finds the chosen kind from the drop-down's value.
 *
 * @param value - the option's value ('' for "Pick one")
 * @returns the kind, or null for anything else
 */
function kindFromValue(value: string): NonNullable<NoticeDraft['kind']> | null {
  if (value === 'removal_order') return 'removal_order';
  return noticeReasons.find((reason) => reason === value) ?? null;
}

/**
 * Renders the drop-down.
 *
 * @returns the labelled group, with the error under it when there is one
 */
export function NoticeKindPicker({ kind, onChoose, errorMessage }: NoticeKindPickerProps) {
  const { i18n } = useTranslation();
  // The reason labels live in the reporting texts; they load with this page.
  registerReportingTranslations(i18n);
  const { t } = useTranslation(['notices', 'reporting']);
  // Step 1: "Pick one" first, then every reason, then the removal order.
  const options: SelectOption[] = [
    { value: '', label: t('notices:form.kindPlaceholder') },
    ...noticeReasons.map((reason) => ({
      value: reason,
      label: t(`reporting:reasons.${reason}.label`),
    })),
    { value: 'removal_order', label: t('notices:form.removalOrder') },
  ];
  // Step 2: the drop-down, with the "choose a kind" message under it after a send without one.
  return (
    <div className="flex flex-col gap-2">
      <Select
        id="notice-kind"
        label={`${t('notices:form.kind')} (${t('notices:form.required')})`}
        isLabelAbove
        options={options}
        value={kind ?? ''}
        onChange={(value) => {
          const chosen = kindFromValue(value);
          if (chosen !== null) onChoose(chosen);
        }}
        isInvalid={errorMessage !== undefined}
        descriptionId={errorMessage === undefined ? undefined : 'notice-kind-error'}
      />
      {errorMessage !== undefined && (
        <p id="notice-kind-error" className="m-0 type-body text-destructive">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
