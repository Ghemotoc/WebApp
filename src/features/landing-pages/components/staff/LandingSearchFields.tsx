/**
 * LandingSearchFields: a landing page's search and share fields in the landing page editor
 * (story S1-E11-38; bundle SEO-1c).
 *
 * A search title and a search description in each of the page's two languages, side by side from
 * 768 px, and "Hide this page from search engines". Every field may stay empty: the server then
 * uses the hero's title and introduction (server/landing-preview.ts). The counters use the same
 * limits the database checks (landing_search_problems()).
 * Who shows it: LandingEditorForm. What it calls: CountedField, and onChange with the new fields.
 */
import { useId } from 'react';

import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import { CountedField } from '@/features/website/components/staff/CountedField';
import { landingLanguages, type LandingSearch } from '@/schemas/landingPages';
import { pageSearchLimits } from '@/schemas/websiteContent';

import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** The fields of a page saved before S1-E11-38: empty, and listed. */
const emptySearch: LandingSearch = {
  hidden: false,
  ro: { title: '', description: '' },
  en: { title: '', description: '' },
};

/** What the card needs. */
interface LandingSearchFieldsProps {
  search: LandingSearch | undefined;
  problems: readonly FieldProblem[];
  onChange: (search: LandingSearch) => void;
}

/** What one language's column needs. */
interface LanguageColumnProps {
  language: (typeof landingLanguages)[number];
  fields: LandingSearch;
  problems: readonly FieldProblem[];
  onChange: (search: LandingSearch) => void;
}

/**
 * One language's title and description.
 *
 * @returns the column
 */
function LanguageColumn({ language, fields, problems, onChange }: LanguageColumnProps) {
  const { t } = useLandingPageTranslation();
  const words = fields[language];
  return (
    <div className="flex min-w-0 flex-col gap-3" lang={language}>
      <h3 className="m-0 text-sm font-bold text-heading">{t(`languages.${language}`)}</h3>
      <CountedField
        id={`landing-search-${language}-title`}
        label={t('editor.search.title')}
        value={words.title}
        limit={pageSearchLimits.title}
        lang={language}
        serverProblem={problemFor(problems, `search.${language}.title`)}
        onChange={(title) => onChange({ ...fields, [language]: { ...words, title } })}
      />
      <CountedField
        id={`landing-search-${language}-description`}
        label={t('editor.search.description')}
        value={words.description}
        limit={pageSearchLimits.description}
        isMultiline
        rows={3}
        lang={language}
        serverProblem={problemFor(problems, `search.${language}.description`)}
        onChange={(description) => onChange({ ...fields, [language]: { ...words, description } })}
      />
    </div>
  );
}

/**
 * Renders the card.
 *
 * @returns a card with both languages' fields and the switch
 */
export function LandingSearchFields({ search, problems, onChange }: LandingSearchFieldsProps) {
  const { t } = useLandingPageTranslation();
  const hiddenId = useId();
  // Step 1: a page saved before S1-E11-38 starts with empty fields.
  const fields = search ?? emptySearch;
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <h2 className="m-0 font-heading text-lg font-bold text-heading">
        {t('editor.search.legend')}
      </h2>
      <p className="m-0 text-sm text-meta">{t('editor.search.intro')}</p>
      {/* Step 2: Romanian and English side by side from 768 px. */}
      <div className="grid gap-6 md:grid-cols-2">
        {landingLanguages.map((language) => (
          <LanguageColumn
            key={language}
            language={language}
            fields={fields}
            problems={problems}
            onChange={onChange}
          />
        ))}
      </div>
      {/* Step 3: the switch; a hidden page still opens from a link, it just isn't listed. */}
      <label htmlFor={hiddenId} className="inline-flex min-h-6 items-center gap-2 text-sm text-ink">
        <input
          id={hiddenId}
          type="checkbox"
          className="h-5 w-5"
          aria-describedby={`${hiddenId}-hint`}
          checked={fields.hidden}
          onChange={(event) => onChange({ ...fields, hidden: event.target.checked })}
        />
        {t('editor.search.hidden')}
      </label>
      <span id={`${hiddenId}-hint`} className="-mt-3 text-xs text-meta">
        {t('editor.search.hiddenHint')}
      </span>
    </section>
  );
}
