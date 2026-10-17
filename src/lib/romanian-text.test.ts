/**
 * Tests for the Romanian letter correction (story S1-E1-04; CLAUDE.md rule 4).
 */
import { describe, expect, it } from 'vitest';

import { normaliseRomanianLetters, normaliseTypedText } from './romanian-text';

describe('normaliseRomanianLetters', () => {
  it('turns the cedilla look-alikes ş, Ş, ţ and Ţ into ș, Ș, ț and Ț', () => {
    expect(normaliseRomanianLetters('şŞţŢ')).toBe('șȘțȚ');
  });

  it('corrects a whole Romanian sentence typed on an old keyboard', () => {
    expect(normaliseRomanianLetters('Ştiinţa şi ţara')).toBe('Știința și țara');
  });

  it('leaves text that is already correct, and every other letter, exactly as it was', () => {
    const correctText = 'Știință, țară, ăâî, English, 2026!';
    expect(normaliseRomanianLetters(correctText)).toBe(correctText);
  });
});

describe('normaliseTypedText', () => {
  it('corrects a field as the person types and keeps the cursor where it was', () => {
    const field = document.createElement('input');
    document.body.append(field);
    field.value = 'ştiri de azi';
    field.setSelectionRange(5, 5);

    normaliseTypedText(field);

    expect(field.value).toBe('știri de azi');
    expect(field.selectionStart).toBe(5);
    field.remove();
  });
});
