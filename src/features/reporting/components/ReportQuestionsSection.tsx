/**
 * ReportQuestionsSection: "Questions about your reports" in Settings: a moderator asked for more
 * details about one of the person's reports, and they answer here, once (story S1-E10-08).
 *
 * Shows nothing when there is no open question, so Settings stays short for almost everyone. The
 * moderator is never named ("the moderation team"). No doodles (DoD: reporting screens).
 * Who shows it: SettingsPage. What it calls: useMyReportQuestions.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import { useMyReportQuestions, type ReportQuestion } from '../hooks/useMyReportQuestions';
import { registerReportingTranslations } from '../registerReportingTranslations';
import { errorShownByHook } from '@/lib/errorShownByHook';

/** The longest answer the database keeps. */
const longestAnswer = 4000;

/**
 * One question with its answer box.
 *
 * @returns a list item
 */
function QuestionItem({
  question,
  questions,
}: {
  question: ReportQuestion;
  questions: ReturnType<typeof useMyReportQuestions>;
}) {
  const { t } = useTranslation('reporting');
  const [text, setText] = useState('');
  const fieldId = `report-answer-${question.reportReference}`;
  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <p className="m-0 text-sm text-meta">
        {t('questions.about', {
          reference: question.reportReference,
          reason: t(`reasons.${question.reason}.label`),
        })}
      </p>
      <p className="m-0 text-body">{question.question}</p>
      <Textarea
        id={fieldId}
        label={t('questions.answer')}
        rows={3}
        maxLength={longestAnswer}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div>
        <Button
          disabled={questions.isAnswering || text.trim() === ''}
          onClick={() => void questions.answer(question.id, text.trim()).catch(errorShownByHook)}
        >
          {t('questions.send')}
        </Button>
      </div>
    </li>
  );
}

/**
 * Renders the section.
 *
 * @returns the section, or nothing without open questions
 */
export function ReportQuestionsSection() {
  const { i18n } = useTranslation();
  registerReportingTranslations(i18n);
  const { t } = useTranslation('reporting');
  const questions = useMyReportQuestions();
  const hasQuestions = questions.questions.length > 0;
  if (!hasQuestions && !questions.loadFailed && !questions.hasAnswered) return null;
  return (
    <section
      aria-labelledby="settings-report-questions-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-report-questions-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('questions.heading')}
      </h2>
      {questions.loadFailed && <Notice tone="error">{t('questions.loadFailed')}</Notice>}
      {questions.answerFailed && <Notice tone="error">{t('questions.answerFailed')}</Notice>}
      {questions.hasAnswered && <Notice tone="success">{t('questions.thanks')}</Notice>}
      {hasQuestions && <p className="m-0 text-body">{t('questions.intro')}</p>}
      <ul className="m-0 flex list-none flex-col p-0">
        {questions.questions.map((question) => (
          <QuestionItem key={question.id} question={question} questions={questions} />
        ))}
      </ul>
    </section>
  );
}
