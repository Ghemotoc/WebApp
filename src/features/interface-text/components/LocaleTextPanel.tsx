/**
 * LocaleTextPanel: one key in one language: the file text as the default, the new text with its
 * preview, "show from", Save draft, Publish, Reset to default and the earlier texts with Restore
 * (story S1-E11-18 criteria 2 and 5 to 8; S1-E11-19 for email keys).
 * Who shows it: TextKeyEditor, once per language, side by side.
 * What it calls: the editor state's act().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { CountedField } from '@/features/website/components/staff/CountedField';
import { EditorFeedback } from '@/features/website/components/staff/EditorFeedback';
import { problemAt } from '@/features/website/lib/fieldProblems';

import type { TextDraft } from '../api/interfaceTextStore';
import type { InterfaceTextEditorState } from '../hooks/useInterfaceTextEditor';
import type { LocaleVersions } from '../lib/textVersionState';

import { EarlierTexts } from './EarlierTexts';
import { TextPreview } from './TextPreview';

/** The longest override the database keeps. */
const textLimit = 5000;

/** What the panel needs. */
export interface LocaleTextPanelProps {
  textKey: string;
  locale: string;
  fileText: string;
  versions: LocaleVersions;
  today: string;
  state: InterfaceTextEditorState;
}

/**
 * The text the panel starts from: the draft, then the scheduled, then the live override, then the
 * file text.
 *
 * @returns the starting text
 */
function startingTextOf(versions: LocaleVersions, fileText: string): string {
  const newest = versions.draft ?? versions.scheduled ?? versions.live;
  if (newest === null || newest.isReset) return fileText;
  return newest.text;
}

/** What the action row needs. */
interface TextActionsProps {
  draft: TextDraft & { showFrom: string };
  today: string;
  /** True while an admin's text is live, so "Reset to default" has something to undo. */
  isOverridden: boolean;
  state: InterfaceTextEditorState;
  onShowFromChange: (date: string) => void;
}

/**
 * The "show from" date, Save draft, Publish (or Schedule) and Reset to default.
 *
 * @returns the row
 */
function TextActions({ draft, today, isOverridden, state, onShowFromChange }: TextActionsProps) {
  const { t } = useTranslation('websiteAdmin');
  const { textKey, locale, showFrom } = draft;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-[200px]">
        <TextInput
          id={`text-${locale}-show-from`}
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
      <Button disabled={state.isActing} onClick={() => void state.act({ kind: 'publish', draft })}>
        {showFrom > today ? t('schedule') : t('publish')}
      </Button>
      {isOverridden && (
        <Button
          variant="destructive"
          disabled={state.isActing}
          onClick={() => void state.act({ kind: 'reset', textKey, locale })}
        >
          {t('interfaceText.reset')}
        </Button>
      )}
    </div>
  );
}

/**
 * Renders the panel.
 *
 * @returns the section for one language
 */
export function LocaleTextPanel({
  textKey,
  locale,
  fileText,
  versions,
  today,
  state,
}: LocaleTextPanelProps) {
  const { t } = useTranslation('websiteAdmin');
  const [text, setText] = useState(startingTextOf(versions, fileText));
  const [showFrom, setShowFrom] = useState(versions.draft?.showFrom ?? today);
  const languageName = t(`languages.${locale}`, { defaultValue: locale });
  const draft = { textKey, locale, text, fileText, showFrom };
  const isOverridden = versions.live !== null && !versions.live.isReset;
  // Only this language's failure and outcome show here.
  const feedback = {
    failure: state.failedLocale === locale ? state.failure : null,
    outcome: state.outcome?.locale === locale ? state.outcome : null,
  };
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={languageName}>
      <h3 className="m-0 font-heading text-lg font-bold text-heading">{languageName}</h3>
      <TextPreview label={t('interfaceText.default')} text={fileText} language={locale} />
      <CountedField
        id={`text-${locale}`}
        label={t('interfaceText.textIn', { language: languageName })}
        value={text}
        limit={textLimit}
        isMultiline
        rows={3}
        lang={locale}
        serverProblem={problemAt(feedback.failure, 'text')}
        onChange={setText}
      />
      <TextPreview label={t('interfaceText.preview')} text={text} language={locale} />
      <TextActions
        draft={draft}
        today={today}
        isOverridden={isOverridden}
        state={state}
        onShowFromChange={setShowFrom}
      />
      <EditorFeedback
        state={feedback}
        labelOf={() => t('interfaceText.textIn', { language: languageName })}
      />
      <EarlierTexts versions={versions} locale={locale} state={state} />
    </section>
  );
}
