/**
 * EditionDetailsForm: the title and description of one language of a story (bundle TRANSLATE-1c;
 * Robert, 16 Nov 2026).
 *
 * Every language has its own title and description; everything else about the story (cover,
 * rating, genre, comments) is set once, on the original, in Story settings.
 * Who shows it: TranslateChaptersPage. What it calls: hooks/useEditionDetails.ts →
 * update_story_language().
 */
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { TextInput } from '@/components/ui/TextInput';
import { languageOwnName } from '@/lib/language-names';
import { MAXIMUM_BLURB_LENGTH, MAXIMUM_TITLE_LENGTH } from '@/schemas/story';

import type { StoryLanguage } from '../api/storyLanguages';
import { useEditionDetails } from '../hooks/useEditionDetails';
import { useStoryLanguagesTranslation } from '../registerStoryLanguagesTranslations';

/**
 * Renders the card.
 *
 * @param props.edition - the language being edited
 * @returns the form
 */
export function EditionDetailsForm({ edition }: { edition: StoryLanguage }) {
  const { t } = useStoryLanguagesTranslation();
  const form = useEditionDetails(edition);
  const language = languageOwnName(edition.languageCode);
  return (
    <section
      aria-labelledby="edition-details-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="edition-details-heading"
        className="m-0 font-heading type-long font-bold text-ink-heading"
      >
        {t('details.heading')}
      </h2>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          form.save();
        }}
      >
        <TextInput
          id="edition-title"
          label={t('details.title', { language })}
          lang={edition.languageCode}
          value={form.title}
          maxLength={MAXIMUM_TITLE_LENGTH}
          autoComplete="off"
          onChange={(event) => form.setTitle(event.target.value)}
        />
        <Textarea
          id="edition-blurb"
          label={t('details.blurb', { language })}
          lang={edition.languageCode}
          value={form.blurb}
          maxLength={MAXIMUM_BLURB_LENGTH}
          onChange={(event) => form.setBlurb(event.target.value)}
        />
        {form.message !== null && (
          <Notice tone={form.message === 'saved' ? 'success' : 'error'}>
            {t(`details.${form.message}`)}
          </Notice>
        )}
        <ButtonRow>
          <Button type="submit" size="lg" variant="secondary" disabled={form.isSaving}>
            {form.isSaving ? t('details.saving') : t('details.save')}
          </Button>
        </ButtonRow>
      </form>
    </section>
  );
}
