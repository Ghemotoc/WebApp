/**
 * FollowersTable: the followers line's numbers as a table, for screen readers (bundle CALM-7b;
 * design handover Step 4: the drawing is hidden, and this table carries the same numbers).
 *
 * It is visually hidden: a caption with the time range ("Followers at the end of each week, last
 * 90 days"), then one row a point with its date, the followers at its end and the new follows in
 * it, each "fewer than 5" where the rule says so (S1-E3-07, criterion 2).
 * Who uses it: FollowersChart. It calls nothing.
 */
import { useTranslation } from 'react-i18next';

import type { FollowersPoint, FollowersRange, FollowersStep } from '../api/followersLine';
import { formatShownCount } from '../lib/dashboardNumbers';
import { pointDate } from '../lib/followersLabels';

/** What the table needs. */
export interface FollowersTableProps {
  points: FollowersPoint[];
  step: FollowersStep;
  range: FollowersRange;
}

/**
 * Renders the hidden table.
 *
 * @param props.points - the line's points, oldest first
 * @param props.step - what one point stands for
 * @param props.range - the chosen time range
 * @returns the table
 */
export function FollowersTable({ points, step, range }: FollowersTableProps) {
  const { t, i18n } = useTranslation('writing');
  const fewer = t('dashboard.fewerThanFive');
  // The wrapper is what hides the table: overflow:hidden doesn't clip a table box, so
  // sr-only on the <table> itself let it widen a phone screen (e2e/narrow-screens.spec.ts).
  return (
    <div className="sr-only">
      <table>
        <caption>
          {t(`dashboard.followers.tableCaption.${step}`, {
            range: t(`dashboard.followers.rangesInSentence.${range}`),
          })}
        </caption>
        <thead>
          <tr>
            <th scope="col">{t(`dashboard.followers.whenColumn.${step}`)}</th>
            <th scope="col">{t('dashboard.followers.totalColumn')}</th>
            <th scope="col">{t(`dashboard.followers.gainedColumn.${step}`)}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.startsOn}>
              <th scope="row">{pointDate(point.startsOn, step, i18n.language)}</th>
              <td>{formatShownCount(point.total, i18n.language, fewer)}</td>
              <td>{formatShownCount(point.gained, i18n.language, fewer)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
