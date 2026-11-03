/**
 * QuestionItemsFields: the questions and answers of a Questions block, Romanian and English side
 * by side, with "Add a question" and "Remove" (story S1-E11-14; bundle CONTESTS-13a1).
 *
 * A question is added or removed in both languages at once, because the page shows the same list
 * in each language and the database refuses lists of different lengths.
 * Who shows it: BlockCard for a Questions block. What it calls: the question helpers in
 * lib/blocks.ts and CountedField.
 */
import { Button } from '@/components/ui/Button';
import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import { CountedField } from '@/features/website/components/staff/CountedField';
import {
  landingLanguages,
  landingQuestionLimits,
  type LandingBlock,
  type LandingLanguage,
} from '@/schemas/landingPages';

import { addQuestion, questionsOf, removeQuestion, withQuestionPart } from '../../lib/blocks';
import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** What the fields need. */
interface QuestionItemsFieldsProps {
  block: LandingBlock;
  index: number;
  problems: readonly FieldProblem[];
  onChange: (block: LandingBlock) => void;
}

/** What one question's fields in one language need. */
type QuestionFieldsProps = QuestionItemsFieldsProps & {
  itemIndex: number;
  language: LandingLanguage;
};

/**
 * One question and its answer in one language.
 *
 * @returns a fieldset with the language as its legend
 */
function QuestionLanguageFields({
  block,
  index,
  itemIndex,
  language,
  problems,
  onChange,
}: QuestionFieldsProps) {
  const { t } = useLandingPageTranslation();
  const item = questionsOf(block, language)[itemIndex] ?? { question: '', answer: '' };
  // The server names a whole item ("blocks.4.en.items.0") when either part is wrong.
  const problem = problemFor(problems, `blocks.${index}.${language}.items.${itemIndex}`);
  const idOf = (part: string) => `landing-b${index}-${language}-q${itemIndex}-${part}`;
  /** Changes the question or the answer. */
  const change = (part: 'question' | 'answer', value: string) =>
    onChange(withQuestionPart(block, { language, index: itemIndex, part }, value));
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="mb-2 p-0 text-sm font-semibold text-ink">
        {t('editor.questionIn', { number: itemIndex + 1, language: t(`languages.${language}`) })}
      </legend>
      <CountedField
        id={idOf('question')}
        label={t('editor.fields.question')}
        lang={language}
        value={item.question}
        limit={landingQuestionLimits.question}
        serverProblem={item.question.trim() === '' ? problem : null}
        onChange={(value) => change('question', value)}
      />
      <CountedField
        id={idOf('answer')}
        label={t('editor.fields.answer')}
        lang={language}
        isMultiline
        value={item.answer}
        limit={landingQuestionLimits.answer}
        serverProblem={item.answer.trim() === '' ? problem : null}
        onChange={(value) => change('answer', value)}
      />
    </fieldset>
  );
}

/**
 * One question's fields in both languages.
 *
 * @returns the pair of columns and the Remove button
 */
function QuestionRow(props: QuestionItemsFieldsProps & { itemIndex: number }) {
  const { t } = useLandingPageTranslation();
  return (
    <li className="flex flex-col gap-3 border-t border-hairline pt-3">
      <div className="grid gap-4 md:grid-cols-2">
        {landingLanguages.map((language) => (
          <QuestionLanguageFields key={language} {...props} language={language} />
        ))}
      </div>
      <div>
        <Button
          variant="destructive"
          onClick={() => props.onChange(removeQuestion(props.block, props.itemIndex))}
        >
          {t('editor.removeQuestion', { number: props.itemIndex + 1 })}
        </Button>
      </div>
    </li>
  );
}

/**
 * Renders the list and "Add a question".
 *
 * @returns the questions
 */
export function QuestionItemsFields(props: QuestionItemsFieldsProps) {
  const { t } = useLandingPageTranslation();
  const count = questionsOf(props.block, 'ro').length;
  const listProblem = problemFor(props.problems, `blocks.${props.index}.items`);
  return (
    <div className="flex flex-col gap-3">
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {Array.from({ length: count }, (_, itemIndex) => (
          <QuestionRow key={itemIndex} {...props} itemIndex={itemIndex} />
        ))}
      </ol>
      {listProblem !== null && (
        <p className="m-0 text-sm text-destructive">{t('editor.problems.items')}</p>
      )}
      <div>
        <Button variant="secondary" onClick={() => props.onChange(addQuestion(props.block))}>
          {t('editor.addQuestion')}
        </Button>
      </div>
    </div>
  );
}
