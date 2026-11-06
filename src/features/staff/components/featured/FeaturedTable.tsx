/**
 * FeaturedTable: the ranking on Stories › Featured (story S1-E5-10; criteria 1, 2 and 4).
 *
 * One row per current active story: a box to pick it, the story and writer, the rank and its
 * change over 7 days, reads this week, read-through, followers, the first chapter's date, the
 * rating and whether it can be featured, with the reason when not ("The writer is under 16").
 * A story that can't be featured has no box to tick, so staff see the refusal before saving.
 * A table on wide screens and label-row cards on phones (CLAUDE.md rule 21). No doodles (staff).
 * Who shows it: FeaturedPage. What it reads: the rows from useFeaturedPicks, already sorted.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { LabelRows } from '@/components/ui/LabelRows';

import type { FeaturedCandidate } from '../../api/featured';
import { useStaffStoryWords } from '../../hooks/useStaffStoryWords';

import { featuredColumns } from './featuredColumns';

/** What the table needs. */
export interface FeaturedTableProps {
  stories: FeaturedCandidate[];
  picks: string[];
  featuredMax: number;
  onToggle: (storyId: string) => void;
}

/**
 * The pick box, or nothing for a story that can't be featured.
 *
 * @returns the checkbox and its hidden label
 */
function PickBox({ story, props }: { story: FeaturedCandidate; props: FeaturedTableProps }) {
  const { t } = useTranslation('staff');
  if (story.ineligibleReason !== null) return null;
  const isPicked = props.picks.includes(story.id);
  const isFull = props.picks.length >= props.featuredMax;
  return (
    <label className="inline-flex size-11 cursor-pointer items-center justify-center">
      <span className="sr-only">{t('featured.pickLabel', { title: story.title })}</span>
      <input
        type="checkbox"
        checked={isPicked}
        disabled={!isPicked && isFull}
        onChange={() => props.onToggle(story.id)}
        className="size-5 accent-primary"
      />
    </label>
  );
}

/**
 * The story cell: its title (opens the reader's page) and "@username · new writer".
 *
 * @returns the cell's content
 */
function StoryCell({ story }: { story: FeaturedCandidate }) {
  const { t } = useTranslation('staff');
  const writer = story.writerHandle === null ? t('shell.noHandle') : `@${story.writerHandle}`;
  return (
    <span className="flex flex-col gap-0.5">
      <Link to={`/s/${story.slug}`} className="font-semibold text-link underline">
        {story.title}
      </Link>
      <span className="text-sm text-meta">
        {writer}
        {story.isNewWriter && <> · {t('featured.newWriter')}</>}
      </span>
    </span>
  );
}

/**
 * Renders the table and the phone cards.
 *
 * @returns the results
 */
export function FeaturedTable(props: FeaturedTableProps) {
  const { t } = useTranslation('staff');
  const words = useStaffStoryWords();
  const { headings, cellsOf } = featuredColumns(t, words.date);
  return (
    <>
      <table className="hidden w-full border-collapse text-sm xl:table">
        <caption className="sr-only">{t('featured.tableCaption')}</caption>
        <thead>
          <tr className="border-b border-border text-left text-meta">
            {[t('featured.columns.pick'), t('featured.columns.story'), ...headings].map(
              (heading) => (
                <th key={heading} scope="col" className="py-2 pr-4 font-semibold">
                  {heading}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {props.stories.map((story) => (
            <tr key={story.id} className="border-b border-border align-middle">
              <td className="pr-2">
                <PickBox story={story} props={props} />
              </td>
              <td className="max-w-[240px] py-2.5 pr-4">
                <StoryCell story={story} />
              </td>
              {cellsOf(story).map((cell, index) => (
                <td key={headings[index]} className="py-2.5 pr-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="m-0 flex list-none flex-col gap-4 p-0 xl:hidden">
        {props.stories.map((story) => (
          <li
            key={story.id}
            className="flex gap-2 rounded-card border border-border bg-surface p-4"
          >
            <PickBox story={story} props={props} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <StoryCell story={story} />
              <LabelRows
                rows={cellsOf(story).map((cell, index) => ({
                  label: headings[index] ?? '',
                  value: cell,
                }))}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
