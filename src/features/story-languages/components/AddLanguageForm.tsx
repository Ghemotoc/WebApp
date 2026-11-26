/**
 * AddLanguageForm: "Add a language" under the table of languages (bundle TRANSLATE-1c; Robert,
 * 16 Nov 2026), as board D08 draws it (CALM-9, user story 5.8).
 *
 * What it shows: a group under a fine line, not a card: the heading, then the language (the
 * ones open for writing that this story doesn't have yet, each in its own name), the title and
 * the blurb in that language, one stacked column of fields at most 480 px wide, the line "You
 * translate it yourself…", and "Add the language" with Cancel beside it. A story at its limit,
 * or already in every open language, gets one line saying so instead of the form.
 * Who shows it: StoryLanguagesPage. What it calls: hooks/useAddLanguage.ts, and the writing
 * feature's useStoryFormOptions for the open languages (story_language_choices()).
 */
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';
import { languageOwnName } from '@/lib/language-names';
import { MAXIMUM_BLURB_LENGTH, MAXIMUM_TITLE_LENGTH } from '@/schemas/story';

import type { StoryLanguages } from '../api/storyLanguages';
import { useAddLanguage } from '../hooks/useAddLanguage';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/** What the form needs. */
export interface AddLanguageFormProps {
  storySlug: string;
  languages: StoryLanguages;
}

/**
 * The languages that can still be added: open for writing and not one the story has.
 *
 * @returns their codes, in the order the new story form lists them
 */
function useLanguagesLeft(languages: StoryLanguages): string[] {
  const options = useStoryFormOptions();
  const taken = new Set(languages.editions.map((edition) => edition.languageCode));
  return options.languages
    .filter((choice) => choice.isOpen && !taken.has(choice.code))
    .map((choice) => choice.code);
}

/** The three fields, one under another, as wide as the board's (480 px). */
function AddLanguageFields(props: { form: ReturnType<typeof useAddLanguage>; left: string[] }) {
  const { form, left } = props;
  const { t } = useStoryLanguagesTranslation();
  const chosen = form.answers.languageCode === '' ? undefined : form.answers.languageCode;
  return (
    <>
      <div className="flex max-w-[480px] flex-col gap-4">
        <Select
          id="add-language-code"
          label={t('add.language')}
          isLabelVisible
          isLabelAbove
          placement="form"
          options={[
            { value: '', label: t('add.chooseLanguage') },
            ...left.map((code) => ({ value: code, label: languageOwnName(code), lang: code })),
          ]}
          value={form.answers.languageCode}
          onChange={(value) => form.set('languageCode', value)}
        />
        <TextInput
          id="add-language-title"
          label={t('add.title')}
          lang={chosen}
          value={form.answers.title}
          maxLength={MAXIMUM_TITLE_LENGTH}
          autoComplete="off"
          onChange={(event) => form.set('title', event.target.value)}
        />
        <Textarea
          id="add-language-blurb"
          label={t('add.blurb')}
          lang={chosen}
          value={form.answers.blurb}
          maxLength={MAXIMUM_BLURB_LENGTH}
          onChange={(event) => form.set('blurb', event.target.value)}
        />
      </div>
    </>
  );
}

/**
 * Renders the group.
 *
 * @returns the form, or the line saying no language can be added
 */
export function AddLanguageForm({ storySlug, languages }: AddLanguageFormProps) {
  const { t } = useStoryLanguagesTranslation();
  const form = useAddLanguage(storySlug);
  const left = useLanguagesLeft(languages);
  const isAtLimit = languages.editions.length >= languages.languagesMax;
  return (
    <section
      aria-labelledby="add-language-heading"
      className="flex flex-col gap-4 border-t border-border pt-6"
    >
      <h2
        id="add-language-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('add.heading')}
      </h2>
      {isAtLimit && (
        <p className="m-0 text-ink-muted">
          {t('add.problems.tooMany', { max: languages.languagesMax })}
        </p>
      )}
      {!isAtLimit && left.length === 0 && <p className="m-0 text-ink-muted">{t('add.noneLeft')}</p>}
      {!isAtLimit && left.length > 0 && (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            form.submit();
          }}
        >
          <AddLanguageFields form={form} left={left} />
          <p className="m-0 type-meta text-ink-muted">{t('add.note')}</p>
          {form.problem !== null && (
            <Notice tone="error">
              {t(`add.problems.${form.problem}`, { max: languages.languagesMax })}
            </Notice>
          )}
          <ButtonRow>
            <Button type="submit" size="lg" disabled={form.isSending}>
              {form.isSending ? t('add.adding') : t('add.submit')}
            </Button>
            <Button type="button" size="lg" variant="text" onClick={form.reset}>
              {t('add.cancel')}
            </Button>
          </ButtonRow>
        </form>
      )}
    </section>
  );
}
