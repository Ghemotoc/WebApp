/**
 * SearchResults: what a search found, under the search field (story S1-E5-04; board Search 3.2;
 * simplified look, bundle CALM-7c, board simplified/New-PhoneSearch).
 *
 * The count across every group, then a segmented control named "Show" with each group that found
 * something (Stories, Writers, Tags) and the chosen group's results, then the line about what
 * search never shows. Wide screens keep the group's shelf; under 768 px the results are rows with
 * the group's count as their heading at the right of the control (handover Step 3, "Search on
 * phones"). With nothing found: "No results for …" and a way to Read (board 3.2, "When nothing
 * matches"). The database leaves out what this reader may not see, so the page adds no rules.
 * Who uses it: SearchPage. What it calls: useSearchResults(), useIsPhoneScreen().
 */
import { useId, useState } from 'react';
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

import { useIsPhoneScreen } from '../hooks/useIsPhoneScreen';
import { useSearchResults } from '../hooks/useSearchResults';
import { searchGroups, type SearchGroup } from '../lib/searchAddresses';
import { groupTotal, type SearchGroupResults } from '../lib/searchGroups';
import { useSearchTranslation } from '../registerSearchTranslations';

import { SearchGroupRows } from './SearchGroupRows';
import { SearchGroupShelf } from './SearchGroupShelf';

/** "No results for …", with the way to Read. */
function NothingFound({ term }: { term: string }) {
  const { t } = useSearchTranslation();
  return (
    <div className="flex flex-col">
      <EmptyState
        title={t('empty.title', { term })}
        description={t('empty.description')}
        action={
          <Link to="/discover" className={buttonClassName({ variant: 'primary' })}>
            {t('empty.browse')}
          </Link>
        }
      />
    </div>
  );
}

/** What the group switch needs. */
interface GroupSwitchProps {
  groups: SearchGroup[];
  chosen: SearchGroup;
  onChoose: (group: SearchGroup) => void;
}

/** The groups with results as one segmented control named "Show" (board New-PhoneSearch). */
function GroupSwitch({ groups, chosen, onChoose }: GroupSwitchProps) {
  const { t } = useSearchTranslation();
  const name = useId();
  return (
    <SegmentedControl
      legend={t('groups.label')}
      isLegendVisible={false}
      name={name}
      options={groups.map((group) => ({ value: group, label: t(`groups.${group}`) }))}
      value={chosen}
      onChange={onChoose}
    />
  );
}

/** What the chosen group's block needs. */
interface ChosenGroupProps extends GroupSwitchProps {
  term: string;
  results: SearchGroupResults;
}

/**
 * Phones: the switch with the count as a meta-line heading at its right, then the rows.
 *
 * @param props - the groups, the chosen one, the term and the results
 * @returns the switch and the rows
 */
function PhoneGroup({ groups, chosen, onChoose, term, results }: ChosenGroupProps) {
  const { t } = useSearchTranslation();
  const headingId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <GroupSwitch groups={groups} chosen={chosen} onChoose={onChoose} />
        <h2 id={headingId} className="m-0 type-meta font-normal">
          {t(`groups.${chosen}Title`, { count: groupTotal(chosen, results) })}
        </h2>
      </div>
      <SearchGroupRows group={chosen} term={term} results={results} headingId={headingId} />
    </div>
  );
}

/** The count, the switch, the chosen group's results and the safety line. */
function FoundResults({ term, results }: { term: string; results: SearchGroupResults }) {
  const { t } = useSearchTranslation();
  const isPhone = useIsPhoneScreen();
  const groups = searchGroups.filter((group) => groupTotal(group, results) > 0);
  const [picked, setPicked] = useState<SearchGroup | null>(null);
  const chosen = picked !== null && groups.includes(picked) ? picked : groups[0];
  const total = groups.reduce((sum, group) => sum + groupTotal(group, results), 0);
  if (chosen === undefined) return <NothingFound term={term} />;
  const switchProps = { groups, chosen, onChoose: setPicked };
  return (
    <div className="flex flex-col gap-6">
      {/* The total is read out when it changes; on phones the group's count heading shows it. */}
      <p aria-live="polite" className="m-0 type-meta max-md:sr-only">
        {t('page.count', { count: total })}
      </p>
      {isPhone ? (
        <PhoneGroup {...switchProps} term={term} results={results} />
      ) : (
        <>
          <GroupSwitch {...switchProps} />
          <SearchGroupShelf group={chosen} term={term} results={results} />
        </>
      )}
      <p className="m-0 type-meta">{t('groups.safetyNote')}</p>
    </div>
  );
}

/**
 * Renders the results, a wait (nothing), or a plain error.
 *
 * @param props.term - the search term from the address
 * @returns the results block
 */
export function SearchResults({ term }: { term: string }) {
  const { t } = useSearchTranslation();
  const found = useSearchResults(term);
  if (found.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (!found.isLoaded || found.stories === null || found.writers === null || found.tags === null) {
    return null;
  }
  return (
    <FoundResults
      key={term}
      term={term}
      results={{ stories: found.stories, writers: found.writers, tags: found.tags }}
    />
  );
}
