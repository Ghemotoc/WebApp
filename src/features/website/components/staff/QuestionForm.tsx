/**
 * QuestionForm: one question being written (story S1-E11-12 criteria 2, 5, 6 and 7).
 *
 * The question, the answer (safe Markdown, with a preview), its order and where it shows: the
 * home page, the help centre or both. A key is typed only for a new question.
 * Who shows it: HelpEditor. What it calls: the editor state's act().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import type { Json } from '@/lib/database.types';
import { questionLimits, questionPlaces, type QuestionContent } from '@/schemas/websiteContent';

import type { WebsiteEditorState } from '../../hooks/useWebsiteEditor';
import { problemAt } from '../../lib/fieldProblems';

import { AddressField } from './AddressField';
import { CountedField } from './CountedField';
import { LegalWordingBox } from './LegalWordingBox';
import { MarkdownField } from './MarkdownField';
import { PublishControls } from './PublishControls';

/** What the form needs. */
export interface QuestionFormProps {
  marketCode: string;
  language: string;
  entryKey: string | null;
  initial: QuestionContent;
  initialShowFrom: string;
  today: string;
  state: WebsiteEditorState;
}

/**
 * The order and place fields.
 *
 * @returns the two fields
 */
function QuestionPlacing({
  question,
  onChange,
}: {
  question: QuestionContent;
  onChange: (next: QuestionContent) => void;
}) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-[140px]">
        <TextInput
          id="question-position"
          type="number"
          min={1}
          label={t('questions.fields.position')}
          value={String(question.position)}
          onChange={(event) => onChange({ ...question, position: Number(event.target.value) || 1 })}
        />
      </div>
      <Select
        id="question-show-on"
        label={t('questions.fields.showOn')}
        options={questionPlaces.map((place) => ({
          value: place,
          label: t(`questions.places.${place}`),
        }))}
        value={question.showOn}
        onChange={(value) => onChange({ ...question, showOn: value as QuestionContent['showOn'] })}
      />
    </div>
  );
}

/** What the question and answer fields need. */
interface QuestionTextsProps {
  question: QuestionContent;
  language: string;
  labelOf: (path: string) => string;
  problemOf: (path: string) => string | null;
  onChange: (next: QuestionContent) => void;
}

/**
 * The question and its answer, the answer with a preview.
 *
 * @returns the fields
 */
function QuestionTexts({ question, language, labelOf, problemOf, onChange }: QuestionTextsProps) {
  return (
    <>
      <CountedField
        id="question-question"
        label={labelOf('question')}
        value={question.question}
        limit={questionLimits.question}
        lang={language}
        serverProblem={problemOf('question')}
        onChange={(text) => onChange({ ...question, question: text })}
      />
      <MarkdownField
        id="question-answer"
        label={labelOf('answer')}
        value={question.answer}
        limit={questionLimits.answer}
        rows={8}
        language={language}
        serverProblem={problemOf('answer')}
        onChange={(answer) => onChange({ ...question, answer })}
      />
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the fields and the publish block
 */
export function QuestionForm({
  marketCode,
  language,
  entryKey,
  initial,
  initialShowFrom,
  today,
  state,
}: QuestionFormProps) {
  const { t } = useTranslation('websiteAdmin');
  const [question, setQuestion] = useState(initial);
  const [key, setKey] = useState(entryKey ?? '');
  const [showFrom, setShowFrom] = useState(initialShowFrom);
  const problemOf = (path: string) => problemAt(state.failure, path);
  const labelOf = (path: string) => t(`questions.fields.${path}`, { defaultValue: path });
  const draft = {
    kind: 'question' as const,
    entryKey: key,
    marketCode,
    languageCode: language,
    content: question as unknown as Json,
    showFrom,
    showUntil: null,
  };
  return (
    <div className="flex flex-col gap-4">
      {entryKey === null && (
        <AddressField
          id="question-key"
          label={t('questions.fields.key')}
          hint={t('help.addressHint')}
          value={key}
          onChange={setKey}
        />
      )}
      <QuestionTexts
        question={question}
        language={language}
        labelOf={labelOf}
        problemOf={problemOf}
        onChange={setQuestion}
      />
      <QuestionPlacing question={question} onChange={setQuestion} />
      <LegalWordingBox
        isLegal={question.isLegal}
        onChange={(isLegal) => setQuestion({ ...question, isLegal })}
      />
      <PublishControls
        idPrefix="question"
        draft={draft}
        onShowFromChange={setShowFrom}
        today={today}
        state={state}
        labelOf={labelOf}
      />
    </div>
  );
}
