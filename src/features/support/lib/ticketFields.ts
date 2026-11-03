/**
 * Helpers for the ticket fields panel: reading the tags box and working out which fields changed
 * (story S1-E11-13 criterion 4; bundle ADMIN-2h1).
 *
 * Who calls it: components/TicketFieldsPanel.tsx. What it calls: nothing.
 */
import type { TicketCategory, TicketStatus } from '../api/supportTickets';
import type { TicketChanges, TicketPriority } from '../api/staffSupportTickets';

/** What the panel's boxes hold. */
export interface TicketFieldValues {
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  /** A username with or without "@", or empty for nobody. */
  assignee: string;
  /** Tags as typed: words separated by commas. */
  tags: string;
}

/**
 * Turns the tags box into a list: split on commas, trimmed, lower case, no empty or repeated
 * words. The database checks the shape (lower-case words and hyphens, at most 10).
 *
 * @param typed - what staff typed, for example "Drafts, login"
 * @returns for example ["drafts", "login"]
 */
export function tagsFromText(typed: string): string[] {
  const words = typed
    .split(',')
    .map((word) => word.trim().toLowerCase())
    .filter((word) => word !== '');
  return [...new Set(words)];
}

/**
 * The fields that differ from the ticket as loaded, so only real changes are sent.
 *
 * @param before - the values the ticket had
 * @param after - the values in the boxes
 * @returns the changes; empty when nothing changed
 */
export function changedFields(before: TicketFieldValues, after: TicketFieldValues): TicketChanges {
  const changes: TicketChanges = {};
  // Step 1: the three drop-downs.
  if (after.status !== before.status) changes.status = after.status;
  if (after.priority !== before.priority) changes.priority = after.priority;
  if (after.category !== before.category) changes.category = after.category;
  // Step 2: the assignee, compared without the "@" people may type.
  const assignee = after.assignee.trim().replace(/^@/, '');
  if (assignee !== before.assignee) changes.assignee = assignee;
  // Step 3: the tags, compared as lists.
  const tags = tagsFromText(after.tags);
  if (tags.join(',') !== tagsFromText(before.tags).join(',')) changes.tags = tags;
  return changes;
}
