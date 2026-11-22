/**
 * CastToolbar: the line above a story's characters (story S1-E17-08; bundle G10a, board
 * AtlasCharacters): how many characters there are, the filter box and "New character".
 *
 * The filter matches names and "also known as" without minding accents (lib/castGroups.ts); its
 * label is for screen readers and its placeholder says what it matches. "New character" is a grey
 * glass add button (handoff: every add action is grey glass); a failure says so in plain words.
 * Who uses it: CharactersPage. What it calls: SearchInput and NewCharacterButton, with the create function it is given.
 */
import { SearchInput } from '@/components/ui/SearchInput';

import { useAtlasTranslation } from '../registerAtlasTranslations';

import { NewCharacterButton } from './NewCharacterButton';

/** What the toolbar needs. */
export interface CastToolbarProps {
  count: number;
  filter: string;
  onFilterChange: (filter: string) => void;
  /** Makes a character and opens its sheet; throws when it can't. */
  onCreate: () => Promise<void>;
}

/**
 * Renders the toolbar.
 *
 * @returns the count heading, the filter and New character
 */
export function CastToolbar({ count, filter, onFilterChange, onCreate }: CastToolbarProps) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-1 basis-[320px] flex-wrap items-center gap-3">
        <h2 id="atlas-cast-heading" className="m-0 text-base font-semibold text-meta">
          {t('characters.count', { count })}
        </h2>
        {count > 0 && (
          <div className="w-full max-w-[440px] min-w-0 flex-1 basis-[260px]">
            <SearchInput
              id="atlas-cast-filter"
              type="search"
              label={t('characters.filter')}
              placeholder={t('characters.filterHint')}
              value={filter}
              onChange={(event) => onFilterChange(event.target.value)}
            />
          </div>
        )}
      </div>
      <NewCharacterButton onCreate={onCreate} />
    </div>
  );
}
