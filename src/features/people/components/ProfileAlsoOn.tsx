/**
 * ProfileAlsoOn: "Also on <product>", the side column's label rows for the rest of the person's
 * public life on the site (bundle 3 of "Build: the full design as user stories", board C04; Robert,
 * 25 Nov 2026, 09:50 UTC).
 *
 * The rows, as the board draws them, each split by a fine line (DoD: label rows; LabelRows' spread look):
 *   - Bookshelves: "3 public bookshelves", linking to /u/<username>/bookshelves (board C06);
 *   - Together: "128 posts", the forum posts this reader may read;
 *   - Spaces: the open spaces the person runs, each linking to its page.
 * A row with nothing in it is left out, and the whole card when every row is empty. The numbers
 * come from profile_activity(), which counts only what this reader may see (never a private
 * bookshelf, a private or class space, or a post hidden from them).
 * Who uses it: WriterProfilePage. What it calls: useProfileActivity → profile_activity().
 */
import { Fragment } from 'react';
import { Link } from 'react-router';

import { LabelRows, type LabelRow } from '@/components/ui/LabelRows';

import type { ProfileActivity } from '../api/profileActivity';
import { useProfileActivity } from '../hooks/useProfileActivity';
import { usePeopleTranslation } from '../registerPeopleTranslations';

/** A link inside a row's value. */
const valueLink = 'font-semibold text-link underline hover:text-link-hover';

/** The spaces as links, joined with commas. */
function SpaceLinks({ spaces }: { spaces: ProfileActivity['spaces'] }) {
  return spaces.map((space, index) => (
    <Fragment key={space.slug}>
      {index > 0 && ', '}
      <Link to={`/spaces/${encodeURIComponent(space.slug)}`} className={valueLink}>
        {space.name}
      </Link>
    </Fragment>
  ));
}

/**
 * The rows that have something in them, in the board's order.
 *
 * @param activity - the profile's activity
 * @param handle - the profile's username, for the bookshelves link
 * @param t - the people translations
 * @returns the rows
 */
function alsoOnRows(
  activity: ProfileActivity,
  handle: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): LabelRow[] {
  const rows: LabelRow[] = [];
  if (activity.publicBookshelves > 0) {
    rows.push({
      label: t('activity.bookshelvesLabel'),
      value: (
        <Link to={`/u/${encodeURIComponent(handle)}/bookshelves`} className={valueLink}>
          {t('activity.publicBookshelves', { count: activity.publicBookshelves })}
        </Link>
      ),
    });
  }
  if (activity.postCount > 0) {
    rows.push({
      label: t('activity.togetherLabel'),
      value: t('activity.posts', { count: activity.postCount }),
    });
  }
  if (activity.spaces.length > 0) {
    rows.push({ label: t('activity.spacesLabel'), value: <SpaceLinks spaces={activity.spaces} /> });
  }
  return rows;
}

/**
 * Renders the card, or nothing when there is nothing to list.
 *
 * @param props.handle - the profile's username
 * @returns the section
 */
export function ProfileAlsoOn({ handle }: { handle: string }) {
  const { t } = usePeopleTranslation();
  const activity = useProfileActivity(handle).data ?? null;
  if (activity === null) return null;
  const rows = alsoOnRows(activity, handle, t);
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="profile-also-on-heading" className="flex flex-col">
      <h2 id="profile-also-on-heading" className="m-0 mb-1 type-heading">
        {t('activity.alsoOnHeading')}
      </h2>
      <LabelRows rows={rows} look="spread" />
    </section>
  );
}
