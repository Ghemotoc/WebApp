/**
 * ClassicSuggestionsPanel: "Newly in the public domain" on /staff/classics (story S1-E11-16 AC 8,
 * part 16b): the listed authors whose works became free on 1 January this year, and those who
 * become free next 1 January, each with their works and whether they are published.
 *
 * Who shows it: ClassicsPage. What it calls: useClassicSuggestions → admin_classic_suggestions()
 * (life plus 70 years, counted from 1 January after the death; Law 8/1996 art. 28(1) and 34).
 * Plain components, no doodles (staff screens).
 */
import { useTranslation } from 'react-i18next';

import { InfoPill } from '@/components/ui/InfoPill';

import type { SuggestedAuthor } from '../../api/classicsImport';
import { useClassicSuggestions } from '../../hooks/useClassicsImport';

/**
 * One year's authors, or a line saying there are none.
 *
 * @param props.heading - the list's heading
 * @param props.authors - the authors
 * @returns the list
 */
function SuggestedAuthors({ heading, authors }: { heading: string; authors: SuggestedAuthor[] }) {
  const { t } = useTranslation('staff');
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 font-heading text-base font-bold text-heading">{heading}</h3>
      {authors.length === 0 && (
        <p className="m-0 text-sm text-meta">{t('classics.suggestions.none')}</p>
      )}
      <ul aria-label={heading} className="m-0 flex list-none flex-col p-0">
        {authors.map((author) => (
          <li key={author.name} className="flex flex-col gap-1 border-b border-border py-2">
            <span className="font-semibold text-heading">
              {t('classics.suggestions.author', { name: author.name, year: author.diedYear })}
            </span>
            <span className="flex flex-wrap gap-2 text-sm text-body">
              {author.works.length === 0 && t('classics.suggestions.noWorks')}
              {author.works.map((work) => (
                <span key={work.storyId} className="inline-flex items-center gap-1.5">
                  {work.title}
                  <InfoPill tone={work.isPublished ? 'sage' : 'neutral'}>
                    {t(work.isPublished ? 'classics.card.live' : 'classics.card.draft')}
                  </InfoPill>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders the panel; nothing while the suggestions load, a line if they can't.
 *
 * @returns the panel
 */
export function ClassicSuggestionsPanel() {
  const { t } = useTranslation('staff');
  const { suggestions, failure } = useClassicSuggestions();
  if (failure !== null) {
    return <p className="m-0 text-sm text-meta">{t('classics.suggestions.failed')}</p>;
  }
  if (suggestions === null) return null;
  return (
    <section
      aria-labelledby="classics-suggestions-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2
        id="classics-suggestions-heading"
        className="m-0 font-heading text-xl font-bold text-heading"
      >
        {t('classics.suggestions.heading')}
      </h2>
      <p className="m-0 text-body">{t('classics.suggestions.intro')}</p>
      <SuggestedAuthors
        heading={t('classics.suggestions.thisYear', { year: suggestions.year })}
        authors={suggestions.freeThisYear}
      />
      <SuggestedAuthors
        heading={t('classics.suggestions.nextYear', { year: suggestions.year + 1 })}
        authors={suggestions.freeNextYear}
      />
    </section>
  );
}
