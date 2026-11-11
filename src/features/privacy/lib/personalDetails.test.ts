/**
 * Unit tests for findPersonalDetails (bundle MUST-1, part b; IDEA-20261108-6).
 * Who runs it: `npm test`. What it proves: phone numbers, email addresses, street addresses and
 * school names are found in Romanian, English and Nordic shapes, and ordinary writing (years,
 * chapter numbers, "school" on its own) is left alone.
 */
import { describe, expect, it } from 'vitest';

import { findPersonalDetails } from './personalDetails';

describe('findPersonalDetails', () => {
  it.each([
    ['Scrie-mi la ana.pop@exemplu.ro', 'email'],
    ['my email is sam_k+books@mail.co.uk', 'email'],
    ['Sună-mă la 0722 123 456', 'phone'],
    ['+40 722 123 456', 'phone'],
    ['call (020) 7946 0958', 'phone'],
    ['text 555-123-4567', 'phone'],
    ['Stau pe Strada Mihai Eminescu nr. 12', 'address'],
    ['Bd. Unirii 3, bloc A', 'address'],
    ['I live at 42 Oak Tree Road', 'address'],
    ['Drottninggatan 5', 'address'],
    ['Merg la Școala Gimnazială nr. 5', 'school'],
    ['sunt la Liceul Teoretic „Ion Creangă”', 'school'],
    ['I go to Hillside High School', 'school'],
    ['eleven på Nørreskolen', 'school'],
  ])('finds "%s" as %s', (text, kind) => {
    expect(findPersonalDetails(text)).toContain(kind);
  });

  it.each([
    'Capitolul 12 a fost cel mai bun.',
    'I read it in 2019 2020 2021 and 2022.',
    'School was hard this week.',
    'Pagina 245, rândul 3.',
    'The score was 3-2.',
    'Mi-a plăcut strada din poveste.',
  ])('leaves "%s" alone', (text) => {
    expect(findPersonalDetails(text)).toEqual([]);
  });
});
