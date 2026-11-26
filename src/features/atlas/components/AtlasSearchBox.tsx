/**
 * AtlasSearchBox: the search box in the Story Atlas top bar (story S1-E17-30: "Given any Story
 * Atlas page, when I look at the top bar, then the search box is there").
 *
 * A small form: what the writer types goes to the search page, /plan/s/<slug>/search?q=…, which
 * shows the results grouped by type. In the top bar it is the box with a quiet "Search" button
 * beside it, up to 420 px wide (board E21, user stories bundle 6). On the search page itself it is
 * the bar under the heading, up to 560 px with the same quiet "Search" and the query already in
 * it (board E34, story 6.15); the top bar leaves its box out there, so a page never has two
 * search fields with one name. An empty or one-letter search still opens the page, which says
 * "Type at least 2 letters to search." (design books item 9: the button never goes quiet).
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
      className={cn(
        'w-full min-w-0',
        isPageBar ? 'max-w-[560px]' : 'max-w-[420px] flex-1 basis-64',
      )}
    >
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(submitted) => {
          submitted.preventDefault();
          // Even an empty box opens the page, which says how much to type (story 6.15).
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
        {/* Both bars have the quiet button (boards E21 and E34). */}
        <Button type="submit" variant="secondary">
          {t('search.button')}
        </Button>
      </form>
    </div>
  );
}
