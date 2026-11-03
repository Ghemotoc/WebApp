/**
 * LandingPublishBar: the "Show from" and "Take down on" dates, Save draft and Publish, and what
 * happened (story S1-E11-14 criteria 9 to 11; bundle CONTESTS-13a1).
 *
 * A version goes live at 00:00 Romanian time on its "show from" date (within a minute when that is
 * today), like every CMS entry. From the take-down date the page stays at its address and says it
 * has ended. Publish is refused with the list of fields to fix; each line names the block, the
 * language and the field.
 * Who shows it: LandingEditorForm. What it calls: act() from useLandingPageEditor.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { formatRomaniaDate } from '@/lib/romania-time';
import type { LandingContent } from '@/schemas/landingPages';

import type { LandingDraftInput } from '../../api/landingPages';
import type { LandingEditorState } from '../../hooks/useLandingPageEditor';
import { labelOfField } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** What the bar needs. */
interface LandingPublishBarProps {
  draft: LandingDraftInput;
  today: string;
  state: LandingEditorState;
  onDatesChange: (showFrom: string, takeDownOn: string | null) => void;
}

/**
 * The message after an action, or the reasons it was refused.
 *
 * @returns a polite live region
 */
function LandingFeedback({
  state,
  content,
}: {
  state: LandingEditorState;
  content: LandingContent;
}) {
  const { t, i18n } = useLandingPageTranslation();
  const { failure, outcome } = state;
  // Step 1: a refusal with fields to fix lists each one by block, language and field.
  if (failure !== null && failure.problems.length > 0) {
    return (
      <Notice tone="error" title={t('editor.fixFields')}>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
          {failure.problems.map((problem) => (
            <li key={`${problem.field}-${problem.problem}`}>
              {labelOfField(problem.field, content, t)}:{' '}
              {t(`editor.problems.${problem.problem}`, {
                defaultValue: t('editor.problems.invalid'),
              })}
            </li>
          ))}
        </ul>
      </Notice>
    );
  }
  // Step 2: any other refusal in one sentence.
  if (failure !== null) {
    return (
      <Notice tone="error">
        {t(`editor.failures.${failure.reason ?? failure.failure}`, {
          defaultValue: t('editor.failures.unreachable'),
        })}
      </Notice>
    );
  }
  if (outcome === null) return null;
  // Step 3: what worked; a publish says the day the page goes live.
  const date =
    outcome.goesLive === null
      ? ''
      : formatRomaniaDate(new Date(`${outcome.goesLive}T12:00:00Z`), i18n.language);
  return (
    <p className="m-0 text-sm text-(--success-text)">
      {t(`editor.outcomes.${outcome.action}`, { date })}
    </p>
  );
}

/**
 * Renders the bar.
 *
 * @returns the dates, the buttons and the feedback
 */
export function LandingPublishBar({ draft, today, state, onDatesChange }: LandingPublishBarProps) {
  const { t } = useLandingPageTranslation();
  const showFrom = draft.showFrom ?? today;
  return (
    <div className="flex flex-col gap-3 border-t border-hairline pt-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-[200px]">
          <TextInput
            id="landing-show-from"
            type="date"
            label={t('editor.showFrom')}
            min={today}
            value={showFrom}
            onChange={(event) => onDatesChange(event.target.value, draft.takeDownOn)}
          />
        </div>
        <div className="w-[200px]">
          <TextInput
            id="landing-take-down-on"
            type="date"
            label={t('editor.takeDownOn')}
            min={showFrom}
            value={draft.takeDownOn ?? ''}
            onChange={(event) =>
              onDatesChange(showFrom, event.target.value === '' ? null : event.target.value)
            }
          />
        </div>
        <Button
          variant="secondary"
          disabled={state.isActing}
          onClick={() => void state.act({ kind: 'save', draft })}
        >
          {t('editor.saveDraft')}
        </Button>
        <Button
          disabled={state.isActing}
          onClick={() => void state.act({ kind: 'publish', draft })}
        >
          {showFrom > today ? t('editor.schedule') : t('editor.publish')}
        </Button>
      </div>
      <p className="m-0 text-sm text-meta">{t('editor.datesHint')}</p>
      <div aria-live="polite">
        <LandingFeedback state={state} content={draft.content} />
      </div>
    </div>
  );
}
