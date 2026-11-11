/**
 * SearchFieldsBox: a page's search and share fields in the website editors (story S1-E11-37;
 * bundle SEO-1b).
 *
 * A search title, a search description and "Hide this page from search engines". Every field may
 * stay empty: the server then uses the page's own words (server/website-head.ts), so staff fill
 * them in only when the page's headline or first lines make a poor search result. The counters
 * use the same limits the database checks (pageSearchLimits, cms_search_problems()).
 * Who shows it: HomePageEditor and HelpPageForm. What it calls: CountedField, and onChange with
 * the changed fields.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { pageSearchLimits, type PageSearch } from '@/schemas/websiteContent';

import { CountedField } from './CountedField';

/** The fields as they are on a page saved before SEO-1b: empty, and listed. */
const emptyPageSearch: PageSearch = { title: '', description: '', hidden: false };

/**
 * The "Hide this page from search engines" switch, with its hint.
 *
 * @returns the tick box and its hint
 */
function HiddenSwitch({
  isHidden,
  onChange,
}: {
  isHidden: boolean;
  onChange: (isHidden: boolean) => void;
}) {
  const { t } = useTranslation('websiteAdmin');
  const hiddenId = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={hiddenId} className="inline-flex min-h-6 items-center gap-2 text-sm text-ink">
        <input
          id={hiddenId}
          type="checkbox"
          className="h-5 w-5"
          aria-describedby={`${hiddenId}-hint`}
          checked={isHidden}
          onChange={(event) => onChange(event.target.checked)}
        />
        {t('search.hiddenLabel')}
      </label>
      <span id={`${hiddenId}-hint`} className="text-xs text-meta">
        {t('search.hiddenHint')}
      </span>
    </div>
  );
}

/** What the box needs. */
interface SearchFieldsBoxProps {
  /** Starts the fields' ids, so two editors on one screen never share an id. */
  idPrefix: string;
  /** The page's search fields, or undefined on a page saved before SEO-1b. */
  search: PageSearch | undefined;
  /** The page's language, for the fields' lang attribute. */
  language: string;
  /** The server's problem for a field ("search.title"), or null. */
  problemOf: (path: string) => string | null;
  onChange: (search: PageSearch) => void;
}

/**
 * Renders the box.
 *
 * @returns a fieldset with the two counted fields and the switch
 */
export function SearchFieldsBox({
  idPrefix,
  search,
  language,
  problemOf,
  onChange,
}: SearchFieldsBoxProps) {
  const { t } = useTranslation('websiteAdmin');
  // Step 1: a page saved before SEO-1b has no search fields yet; it starts with empty ones.
  const fields = search ?? emptyPageSearch;
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 rounded-card border border-border p-4">
      <legend className="px-1 font-heading text-lg font-bold text-heading">
        {t('search.legend')}
      </legend>
      <p className="m-0 text-sm text-meta">{t('search.intro')}</p>
      {/* Step 2: the title and description, with counters the database agrees with. */}
      <CountedField
        id={`${idPrefix}-search-title`}
        label={t('help.fields.search.title')}
        hint={t('search.titleHint')}
        value={fields.title}
        limit={pageSearchLimits.title}
        lang={language}
        serverProblem={problemOf('search.title')}
        onChange={(title) => onChange({ ...fields, title })}
      />
      <CountedField
        id={`${idPrefix}-search-description`}
        label={t('help.fields.search.description')}
        hint={t('search.descriptionHint')}
        value={fields.description}
        limit={pageSearchLimits.description}
        isMultiline
        rows={3}
        lang={language}
        serverProblem={problemOf('search.description')}
        onChange={(description) => onChange({ ...fields, description })}
      />
      {/* Step 3: the switch; a hidden page still opens from a link, it just isn't listed. */}
      <HiddenSwitch
        isHidden={fields.hidden}
        onChange={(hidden) => onChange({ ...fields, hidden })}
      />
    </fieldset>
  );
}
