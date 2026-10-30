/**
 * Fills the brand placeholders in CMS text (decided 17 Oct 2026, 12:47: the product name is never
 * typed into content, so a rename is one change in src/config/brand.ts).
 *
 * Who calls it: every website component that shows CMS text.
 */
import { brand } from '@/config/brand';
import { fillBrandTokens } from '@/features/legal/lib/fillBrandTokens';

/**
 * Fills {{productName}} and the other brand tokens.
 *
 * @param text - CMS text
 * @returns the text with the brand's values
 */
export function withBrand(text: string): string {
  return fillBrandTokens(text, brand);
}
