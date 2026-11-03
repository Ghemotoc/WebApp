/**
 * The words for one value in a support ticket's history: a status, priority or category in the
 * staff member's language, a username, a ticket number after a merge (part h4a), or the tags
 * (story S1-E11-13 criterion 4; bundle ADMIN-2h1).
 *
 * Who calls it: components/TicketHistory.tsx. What it calls: the translations it is given.
 */
import type { TFunction } from 'i18next';

import type { Json } from '@/lib/database.types';

/** Where each field's values are named in the "support" namespace. */
const valueKeyPrefixes: Record<string, string> = {
  status: 'statuses',
  priority: 'staff.priorities',
  category: 'categories',
};

/**
 * One value of a change, in words.
 *
 * @param change - which field changed
 * @param value - its value before or after
 * @param t - the support translations
 * @returns the words
 */
export function valueWords(change: string, value: Json | null, t: TFunction): string {
  if (Array.isArray(value)) return value.length === 0 ? t('staff.history.none') : value.join(', ');
  if (typeof value !== 'string') return t('staff.history.nobody');
  // A merge names the other ticket by its number (part h4a).
  if (change === 'merged_into' || change === 'merged_from') return `#${value}`;
  const prefix = valueKeyPrefixes[change];
  if (prefix !== undefined) return t(`${prefix}.${value}`);
  return `@${value}`;
}
