/**
 * The signature's limits as the Settings form counts them (story S1-E8-08 criterion 1: at most
 * 300 characters and three lines). The database checks the same limits when it saves
 * (set_my_signature()); the form only says so early.
 * Who calls it: SignatureWordsForm. What it calls: nothing.
 */
import { signatureMaxLength, signatureMaxLines } from '../api/forumSignatures';

/** What the form says about the words as they are typed. */
export interface SignatureCount {
  characters: number;
  lines: number;
  isTooLong: boolean;
  hasTooManyLines: boolean;
}

/**
 * Counts the words the way the database does: spaces and line breaks around them are trimmed,
 * and an empty signature has no lines.
 *
 * @param text - the words as typed
 * @returns the characters, the lines and whether either is over its limit
 */
export function countSignature(text: string): SignatureCount {
  const cleaned = text.replace(/\r/g, '').trim();
  const characters = [...cleaned].length;
  const lines = cleaned === '' ? 0 : cleaned.split('\n').length;
  return {
    characters,
    lines,
    isTooLong: characters > signatureMaxLength,
    hasTooManyLines: lines > signatureMaxLines,
  };
}
