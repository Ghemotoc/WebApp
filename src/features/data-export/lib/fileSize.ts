/**
 * A file's size in words for the Settings line: "840 kB" or "2.4 MB" (story S1-E13-02).
 *
 * Who calls it: ExportStatus. What it calls: the browser's Intl.NumberFormat, so the number reads
 * the way the interface language writes it ("2,4 MB" in Romanian).
 */
import { dateLocaleFor } from '@/lib/romania-time';

/** One kilobyte and one megabyte, in bytes (the decimal units every system shows today). */
const kilobyte = 1000;
const megabyte = 1000 * 1000;

/**
 * Writes a size.
 *
 * @param bytes - the size in bytes
 * @param language - the interface language
 * @returns the size with its unit
 */
export function fileSizeText(bytes: number, language: string): string {
  const locale = dateLocaleFor(language);
  // Under a megabyte, whole kilobytes (at least 1); from a megabyte, one decimal.
  if (bytes < megabyte) {
    const kilobytes = Math.max(1, Math.round(bytes / kilobyte));
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'kilobyte' }).format(kilobytes);
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 1,
  }).format(bytes / megabyte);
}
