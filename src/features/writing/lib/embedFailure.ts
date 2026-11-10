/**
 * The plain message for a music or video link our server refused (story S1-E3-10).
 *
 * Who uses it: EmbedInsertDialog (a new card) and EmbedLinkChange (a card's new link, bundle
 * GAPS-8), which show it under the link field.
 * What it reads: the reason EmbedAddError carries (src/features/embeds/api/embeds.ts).
 */
import { EmbedAddError } from '@/features/embeds/api/embeds';

/**
 * Picks the message for a refused link.
 *
 * @param error - what the addition threw
 * @returns the translation key and its values (editor namespace)
 */
export function embedFailureMessage(error: unknown): {
  key: string;
  values?: Record<string, number>;
} {
  if (!(error instanceof EmbedAddError)) return { key: 'embedDialog.failed.unreachable' };
  if (error.failure === 'too_many') {
    return { key: 'embedDialog.failed.too_many', values: { minutes: error.waitMinutes ?? 60 } };
  }
  return { key: `embedDialog.failed.${error.failure}` };
}
