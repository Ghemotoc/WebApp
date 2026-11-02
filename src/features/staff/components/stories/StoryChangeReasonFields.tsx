/**
 * StoryChangeReasonFields: the reason every staff change to a story needs: one reason from the
 * list and a few words (bundle ADMIN-2, part b1; story S1-E11-08 criterion 2). The writer reads
 * both in their statement of reasons or notification, so the hint says so.
 *
 * Who shows it: StaffStorySettingsForm, StaffStoryVisibilityForm and ChapterVisibilityForm.
 * What it calls: nothing; the form that shows it sends the reason with its change.
 */
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

import { storyChangeReasons } from '../../api/staffStoryChanges';
import { reasonMaxLength, type ReasonDraft } from '../../lib/staffStorySettingsDiff';

/** What the fields need. */
export interface StoryChangeReasonFieldsProps {
  /** Makes the field ids unique on the page. */
  idPrefix: string;
  reason: ReasonDraft;
  onChange: (reason: ReasonDraft) => void;
  /** Shown under the words when the form was sent without a complete reason. */
  problem: string | null;
}

/**
 * Renders the list and the words.
 *
 * @returns the two fields
 */
export function StoryChangeReasonFields({
  idPrefix,
  reason,
  onChange,
  problem,
}: StoryChangeReasonFieldsProps) {
  const { t } = useTranslation('staff');
  const textId = `${idPrefix}-reason-text`;
  const options = [
    { value: '', label: t('stories.change.pickReason') },
    ...storyChangeReasons.map((code) => ({
      value: code,
      label: t(`stories.change.reasons.${code}`),
    })),
  ];
  return (
    <div className="flex flex-col gap-3">
      <Select
        id={`${idPrefix}-reason-code`}
        label={t('stories.change.reasonLabel')}
        isLabelVisible
        placement="form"
        value={reason.code}
        onChange={(code) => onChange({ ...reason, code })}
        options={options}
      />
      <Textarea
        id={textId}
        label={t('stories.change.reasonText')}
        hint={t('stories.change.reasonHint')}
        // The hint and, once the form was sent without a complete reason, the error under it.
        aria-describedby={problem === null ? `${textId}-hint` : `${textId}-hint ${textId}-error`}
        aria-invalid={problem === null ? undefined : true}
        rows={3}
        maxLength={reasonMaxLength}
        value={reason.text}
        onChange={(event) => onChange({ ...reason, text: event.target.value })}
      />
      {problem !== null && (
        <p id={`${textId}-error`} role="alert" className="m-0 text-sm text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
