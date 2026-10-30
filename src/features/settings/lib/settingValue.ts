/**
 * Turning a setting's value into the text of its field and back (story S1-E11-03).
 *
 * Who calls it: components/ValueSettingRow.tsx.
 * A setting is a number, a word, or a list of numbers or words. The field is always text; this
 * file reads the typed text back into the same kind of value, or says it can't. The database
 * checks the shape again (setting_value_problem()), so this is for a quick message only.
 */
import type { Json } from '@/lib/database.types';

/** What the field holds: a number, a word, or a list written with commas. */
export type SettingKind = 'number' | 'word' | 'list_of_numbers' | 'list_of_words';

/**
 * Which kind of field a value needs.
 *
 * @param value - the setting's current value
 * @returns its kind, or null for an object (those have their own editor)
 */
export function settingKindOf(value: Json): SettingKind | null {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'word';
  if (Array.isArray(value)) {
    return value.every((item) => typeof item === 'number') ? 'list_of_numbers' : 'list_of_words';
  }
  return null;
}

/**
 * The text a field shows for a value.
 *
 * @param value - the value
 * @returns the text, lists joined with ", "
 */
export function fieldTextOf(value: Json): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (value === null || typeof value === 'object') return '';
  return String(value);
}

/**
 * Reads one number typed in a field, allowing a decimal comma (Romanian writes 0,5).
 *
 * @param text - the typed text
 * @returns the number, or null when it isn't one or is below zero
 */
function numberFrom(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '') return null;
  const number = Number(cleaned);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/**
 * Reads typed text back into a value of the given kind.
 *
 * @param kind - the setting's kind
 * @param text - what the admin typed
 * @returns the value, or null when the text doesn't fit the kind
 */
export function valueFromField(kind: SettingKind, text: string): Json | null {
  if (kind === 'number') return numberFrom(text);
  if (kind === 'word') return text.trim() === '' ? null : text.trim();
  // Lists: items are separated by semicolons or by commas followed by a space, so "0,5" stays
  // one number; empty items are dropped.
  const items = text
    .split(/;|,\s+/)
    .map((item) => item.trim())
    .filter((item) => item !== '');
  if (items.length === 0) return null;
  if (kind === 'list_of_words') return items;
  const numbers = items.map(numberFrom);
  return numbers.every((number) => number !== null) ? (numbers as number[]) : null;
}
