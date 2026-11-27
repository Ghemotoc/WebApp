/**
 * ReadingLanguagesSection: "Reading languages" in Settings › Language (bundle MARKETS-2, part c;
 * IDEA-20261109-2).
 *
 * A member ticks the story languages they read; Discover's lists, the genre pages and See all then
 * show stories in those languages. With none ticked, they read the interface language plus
 * English (the intro says which). Each language is named in its own language with a lang
 * attribute, so screen readers pronounce it right (WCAG 3.1.2), as in the interface language menu.
 * Who shows it: SettingsGroupPanel, in the Language group, under LanguageSettingsSection.
 * What it calls: useReadingLanguages (my pick and saving it) and useLanguagesWrittenIn: only the
 * languages stories are written in (S1-E3-01; Robert, 26 Nov 2026), plus the ones already ticked
 * or in the default, so none of them disappears from the list.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Notice } from '@/components/ui/Notice';
import { useLanguagesWrittenIn } from '@/features/discovery/hooks/useLanguagesWrittenIn';
import { errorShownByHook } from '@/lib/errorShownByHook';

import { defaultReadingLanguages, useReadingLanguages } from '../hooks/useReadingLanguages';

/**
 * A language's name in that language ("svenska", "română").
 *
 * @param code - the language code
 * @returns the name, or the code when the browser doesn't know it
 */
function ownName(code: string): string {
  const name = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
  return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
}

/** What the form needs. */
interface ReadingLanguagesFormProps {
  state: ReturnType<typeof useReadingLanguages>;
  /** The story languages to offer, in the order of their names in the interface language. */
  codes: string[];
}

/**
 * The tick boxes and Save, started from the saved pick or the default.
 *
 * @returns the form
 */
function ReadingLanguagesForm({ state, codes }: ReadingLanguagesFormProps) {
  const { t, i18n } = useTranslation();
  const [ticked, setTicked] = useState<string[]>(
    state.saved ?? defaultReadingLanguages(i18n.language, true),
  );

  /** Ticks or unticks one language, keeping the order they were ticked in. */
  function toggle(code: string) {
    setTicked((current) =>
      current.includes(code) ? current.filter((each) => each !== code) : [...current, code],
    );
  }

  /** Saves the pick; the hook refreshes the story lists. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await state.save(ticked);
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => void handleSubmit(event).catch(errorShownByHook)}
    >
      {/* One chip per language, as on the board (bundle 10, J06): a chosen chip is filled and
          shows a check, and says so with aria-pressed (DoD, pill system: never colour alone). */}
      <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
        <legend className="mb-3 p-0 font-semibold text-ink-heading">
          {t('language.readingLegend')}
        </legend>
        {codes.map((code) => (
          <span key={code} lang={code} className="contents">
            <Chip isPressed={ticked.includes(code)} onPressedChange={() => toggle(code)}>
              {ownName(code)}
            </Chip>
          </span>
        ))}
      </fieldset>
      {/* What happened, read out politely by screen readers. */}
      <div role="status">
        {state.isSaved && !state.isSaving && (
          <Notice tone="success">{t('language.readingSaved')}</Notice>
        )}
      </div>
      {state.saveFailure !== null && (
        <Notice tone="error">{t('language.readingSaveFailed')}</Notice>
      )}
      <Button type="submit" variant="secondary" className="self-start" disabled={state.isSaving}>
        {state.isSaving ? t('language.readingSaving') : t('language.readingSave')}
      </Button>
    </form>
  );
}

/**
 * The intro, naming the default: the interface language and English.
 *
 * @returns the line
 */
function ReadingIntro() {
  const { t, i18n } = useTranslation();
  if (i18n.language === 'en')
    return <p className="m-0 text-ink-muted">{t('language.readingIntroEnglish')}</p>;
  // The interface language's name in the interface language ("română", "svenska").
  const interfaceName =
    new Intl.DisplayNames([i18n.language], { type: 'language' }).of(i18n.language) ?? i18n.language;
  return (
    <p className="m-0 text-ink-muted">{t('language.readingIntro', { interface: interfaceName })}</p>
  );
}

/**
 * Renders the section.
 *
 * @returns the section headed "Reading languages"
 */
export function ReadingLanguagesSection() {
  const { t, i18n } = useTranslation();
  const state = useReadingLanguages();
  // The languages written in, plus the saved pick or the default, so a ticked one stays.
  const { languages } = useLanguagesWrittenIn(
    state.saved ?? defaultReadingLanguages(i18n.language, true),
  );
  const codes = languages.map(({ code }) => code);
  return (
    <section
      id="reading-languages"
      aria-labelledby="settings-reading-languages-heading"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-reading-languages-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('language.readingHeading')}
      </h2>
      <ReadingIntro />
      {state.loadFailed && <Notice tone="error">{t('language.readingLoadFailed')}</Notice>}
      {state.isLoaded && codes.length > 0 && <ReadingLanguagesForm state={state} codes={codes} />}
    </section>
  );
}
