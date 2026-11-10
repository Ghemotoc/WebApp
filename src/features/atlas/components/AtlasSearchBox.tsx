/**
 * AtlasSearchBox: the search box in the Story Atlas top bar (story S1-E17-30: "Given any Story
 * Atlas page, when I look at the top bar, then the search box is there").
 *
 * A small form: what the writer types goes to the search page, /plan/s/<slug>/search?q=…, which
 * shows the results grouped by type. On the search page the box starts with the query, so it
 * can be changed in place. Who uses it: AtlasTopBar. What it calls: React Router's navigate.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { SearchInput } from '@/components/ui/SearchInput';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the box.
 *
 * @param props.slug - the story open now, the only one searched
 * @returns the search form
 */
export function AtlasSearchBox({ slug }: { slug: string }) {
  const { t } = useAtlasTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [typed, setTyped] = useState(searchParams.get('q') ?? '');
  return (
    <div role="search" className="w-full min-w-0 sm:w-60">
      <form
        onSubmit={(submitted) => {
          submitted.preventDefault();
          // An empty box opens nothing.
          if (typed.trim() === '') return;
          void navigate(`/plan/s/${slug}/search?q=${encodeURIComponent(typed.trim())}`);
        }}
      >
        <SearchInput
          id="atlas-search"
          label={t('search.label')}
          placeholder={t('search.placeholder')}
          maxLength={200}
          value={typed}
          onChange={(changed) => setTyped(changed.target.value)}
        />
      </form>
    </div>
  );
}
