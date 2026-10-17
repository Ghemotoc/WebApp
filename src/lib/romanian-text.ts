/**
 * Romanian letters: swaps the cedilla look-alikes for the correct comma-below letters
 * (story S1-E1-04; CLAUDE.md rule 4).
 *
 * Why: Romanian writes ș and ț with a comma below. Older keyboards, PDFs and copy-and-paste often
 * produce ş and ţ (with a cedilla) instead, which look almost the same but are different letters:
 * search, sorting and screen readers treat them as different words. So text is corrected as it is
 * typed or pasted, and again before it is saved (the content stories call
 * normaliseRomanianLetters() in their zod schemas, starting with the chapter editor, S1-E3-02).
 *
 * Who calls it: the shared text fields (TextInput, Textarea, SearchInput in src/components/ui/)
 * through normaliseTypedText(); scripts/check-i18n-keys.ts applies the same rule to the
 * translation files.
 */

/** Each cedilla look-alike and the correct Romanian letter that replaces it. */
const cedillaToCommaBelow: Readonly<Record<string, string>> = {
  ş: 'ș', // U+015F → U+0219
  Ş: 'Ș', // U+015E → U+0218
  ţ: 'ț', // U+0163 → U+021B
  Ţ: 'Ț', // U+0162 → U+021A
};

/** Finds any of the four cedilla look-alikes. */
const cedillaLetterPattern = /[şŞţŢ]/g;

/**
 * Replaces ş, Ş, ţ and Ţ with ș, Ș, ț and Ț. Every other character is left exactly as it was.
 *
 * @param text - any text, in any language
 * @returns the same text with the comma-below letters
 */
export function normaliseRomanianLetters(text: string): string {
  return text.replace(cedillaLetterPattern, (letter) => cedillaToCommaBelow[letter] ?? letter);
}

/**
 * Corrects the text in a field the person is typing or pasting into, keeping the cursor where it
 * was. Each swap is one letter for one letter, so the cursor position stays valid.
 *
 * @param field - the <input> or <textarea> that just changed
 * Where it fits: the shared text fields call it first in their onChange, before the form sees the
 *   value, so every form gets corrected text without doing anything itself.
 */
export function normaliseTypedText(field: HTMLInputElement | HTMLTextAreaElement): void {
  // Step 1: nothing to do for most keystrokes.
  const correctedText = normaliseRomanianLetters(field.value);
  if (correctedText === field.value) return;

  // Step 2: remember the cursor, swap the text, then put the cursor back. Some field types
  // (such as email) have no cursor position; for those the browser returns null.
  const { selectionStart, selectionEnd } = field;
  field.value = correctedText;
  if (selectionStart !== null && selectionEnd !== null) {
    field.setSelectionRange(selectionStart, selectionEnd);
  }
}
