/**
 * AtlasSearchBox: the search box in the Story Atlas top bar (story S1-E17-30: "Given any Story
 * Atlas page, when I look at the top bar, then the search box is there").
 *
 * A small form: what the writer types goes to the search page, /plan/s/<slug>/search?q=…, which
 * shows the results grouped by type. In the top bar it is the box with a quiet "Search" button
 * beside it, up to 420 px wide (board E21, user stories bundle 6). On the search page itself it is
 * the wide bar under the heading, with the main "Search" button and the query already in it
 * (board AtlasSearch, G10c4); the top bar leaves its box out there, so a page never has two
 * search fields with one name.
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
    <div
      role="search"
      className={cn('w-full min-w-0', !isPageBar && 'max-w-[420px] flex-1 basis-64')}
    >
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(submitted) => {
          submitted.preventDefault();
          // An empty box opens nothing.
          if (typed.trim() === '') return;
          void navigate(`/plan/s/${slug}/search?q=${encodeURIComponent(typed.trim())}`);
        }}
      >
        <div className="min-w-0 flex-1 basis-40">
          <SearchInput
            id="atlas-search"
            label={t('search.label')}
            placeholder={t('search.placeholder')}
            maxLength={200}
            value={typed}
            onChange={(changed) => setTyped(changed.target.value)}
          />
        </div>
        {/* The page's own bar has the main button; the top bar's is the quiet one (board E21). */}
        <Button type="submit" variant={isPageBar ? 'primary' : 'secondary'}>
          {t('search.button')}
        </Button>
      </form>
    </div>
  );
}
