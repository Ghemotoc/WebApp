/**
 * AtlasSearchBox: the search box in the Story Atlas top bar (story S1-E17-30: "Given any Story
 * Atlas page, when I look at the top bar, then the search box is there").
 *
 * A small form: what the writer types goes to the search page, /plan/s/<slug>/search?q=…, which
 * shows the results grouped by type. On the search page itself it is the wide bar under the
 * heading, with a "Search" button and the query already in it (board AtlasSearch, G10c4); the top
 * bar leaves its small box out there, so a page never has two search fields with one name.
 * Who uses it: AtlasTopBar and AtlasSearchPage. What it calls: React Router's navigate.
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/lib/utils';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Renders the box.
 *
 * @param props.slug - the story open now, the only one searched
 * @param props.isPageBar - true for the wide bar on the search page
 * @returns the search form
 */
export function AtlasSearchBox({ slug, isPageBar = false }: { slug: string; isPageBar?: boolean }) {
  const { t } = useAtlasTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [typed, setTyped] = useState(searchParams.get('q') ?? '');
  return (
    <div role="search" className={cn('w-full min-w-0', !isPageBar && 'sm:w-60')}>
      <form
        className={cn(isPageBar && 'flex flex-wrap items-center gap-2')}
        onSubmit={(submitted) => {
          submitted.preventDefault();
          // An empty box opens nothing.
          if (typed.trim() === '') return;
          void navigate(`/plan/s/${slug}/search?q=${encodeURIComponent(typed.trim())}`);
        }}
      >
        <div className={cn('min-w-0', isPageBar && 'flex-1 basis-56')}>
          <SearchInput
            id="atlas-search"
            label={t('search.label')}
            placeholder={t('search.placeholder')}
            maxLength={200}
            value={typed}
            onChange={(changed) => setTyped(changed.target.value)}
          />
        </div>
        {isPageBar && <Button type="submit">{t('search.button')}</Button>}
      </form>
    </div>
  );
}
