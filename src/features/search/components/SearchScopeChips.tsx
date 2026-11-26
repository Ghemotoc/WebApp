/**
 * SearchScopeChips: Stories, Writers, Together and Spaces under the search field before a search
 * (user story 1.7, board A07-Search).
 *
 * One of the four is always chosen, Stories first. The choice lives in the address ("in", the same
 * part the results tabs use), so the search the member then types opens on that tab, and a
 * shared /search?in=writers link starts there too. Picking a chip changes the address in place,
 * without a new history entry, because it only prepares the search.
 * Look: the shared ChoiceChips (a radiogroup of 36 px chips with a 44 px touch target; the chosen
 * one filled with a tick, never colour alone). The group's name is for screen readers only, as
 * the board draws the chips with no label.
 * Who uses it: SearchPage. What it calls: ChoiceChips; the page puts the choice in the address.
 */
import { ChoiceChips } from '@/components/ui/ChoiceChips';

import { searchTabs, type SearchTab } from '../lib/searchFilters';
import { useSearchTranslation } from '../registerSearchTranslations';

/** What the chips need. */
export interface SearchScopeChipsProps {
  /** The tab chosen now. */
  scope: SearchTab;
  /** Puts a new choice in the address. */
  onChange: (scope: SearchTab) => void;
}

/**
 * Renders the four chips.
 *
 * @param props.scope - the tab chosen now
 * @param props.onChange - applies a new choice
 * @returns the chip group
 */
export function SearchScopeChips({ scope, onChange }: SearchScopeChipsProps) {
  const { t } = useSearchTranslation();
  return (
    <ChoiceChips
      label={t('scope.label')}
      options={searchTabs.map((tab) => ({ value: tab, label: t(`tabs.${tab}`) }))}
      value={scope}
      onChange={(picked) => {
        // Only a known tab is a choice; the group never offers anything else.
        const chosen = searchTabs.find((tab) => tab === picked);
        if (chosen !== undefined) onChange(chosen);
      }}
    />
  );
}
