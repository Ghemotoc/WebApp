/**
 * PublishControls: the "Show from" date, Save draft and Publish, under every website editor
 * (story S1-E11-06 criteria 5 and 6; architecture 1.8.6 steps 3 and 4).
 *
 * A version goes live at 00:00 Romanian time on its "show from" date, or within a minute when
 * the date is today; until then the current version stays up. Save draft changes nothing on the
 * website. Who uses it: HomePageEditor, NoticeEditor, HelpPageForm and QuestionForm.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { DraftInput } from '../../api/websiteContentStore';
import type { WebsiteEditorState } from '../../hooks/useWebsiteEditor';

import { EditorFeedback } from './EditorFeedback';

/** What the controls need. */
interface PublishControlsProps {
  idPrefix: string;
  /** The version as the form holds it now; its "show from" date is the date field. */
  draft: DraftInput;
  onShowFromChange: (date: string) => void;
  today: string;
  state: WebsiteEditorState;
  labelOf: (field: string) => string;
}

/**
 * Renders the controls and the feedback.
 *
 * @returns the publish block
 */
export function PublishControls({
  idPrefix,
  draft,
  onShowFromChange,
  today,
  state,
  labelOf,
}: PublishControlsProps) {
  const { t } = useTranslation('websiteAdmin');
  const showFrom = draft.showFrom ?? today;
  return (
    <div className="flex flex-col gap-3 border-t border-hairline pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[200px]">
          <TextInput
            id={`${idPrefix}-show-from`}
            type="date"
            label={t('showFrom')}
            min={today}
            value={showFrom}
            onChange={(event) => onShowFromChange(event.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          disabled={state.isActing}
          onClick={() => void state.act({ kind: 'save', draft })}
        >
          {t('saveDraft')}
        </Button>
        <Button
          disabled={state.isActing}
          onClick={() => void state.act({ kind: 'publish', draft })}
        >
          {showFrom > today ? t('schedule') : t('publish')}
        </Button>
      </div>
      <p className="m-0 text-sm text-meta">{t('showFromHint')}</p>
      <EditorFeedback state={state} labelOf={labelOf} />
    </div>
  );
}
