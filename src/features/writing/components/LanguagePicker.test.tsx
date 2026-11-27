/**
 * The writer's searchable language picker (story S1-E3-01; Robert, 26 Nov 2026: "the writer can
 * pick the language from an all language list"). The tests run in Romanian, the interface's
 * first language.
 */
import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { languageChoices } from '@/lib/language-names';
import { worldLanguageCodes } from '@/lib/world-languages';
import { renderWithProviders } from '@/test/renderWithProviders';

import { LanguagePicker } from './LanguagePicker';

/** The picker with its answer kept, as the story form keeps it. */
function PickerWithAnswer() {
  const [code, setCode] = useState('ro');
  return (
    <LanguagePicker
      id="story-language"
      label="Limba poveștii"
      choices={languageChoices(worldLanguageCodes, 'ro')}
      value={code}
      onChange={setCode}
    />
  );
}

/** The drop-down, found by its label. */
function dropDown(): HTMLSelectElement {
  return screen.getByRole('combobox', { name: 'Limba poveștii' });
}

describe('the language picker', () => {
  it('offers every language of the world', () => {
    renderWithProviders(<PickerWithAnswer />);
    expect(dropDown().options).toHaveLength(worldLanguageCodes.length);
  });

  it('narrows the list to what the writer types, keeping the chosen language', () => {
    renderWithProviders(<PickerWithAnswer />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Caută o limbă' }), {
      target: { value: 'japon' },
    });
    const listed = Array.from(dropDown().options, (option) => option.textContent);
    expect(listed).toEqual(['Română', 'Japoneză']);
    expect(screen.getByText('1 limbă')).toBeInTheDocument();
  });

  it('lets the writer pick a language nobody opened before', () => {
    renderWithProviders(<PickerWithAnswer />);
    fireEvent.change(dropDown(), { target: { value: 'ja' } });
    expect(dropDown().value).toBe('ja');
  });

  it('says so when no language matches', () => {
    renderWithProviders(<PickerWithAnswer />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Caută o limbă' }), {
      target: { value: 'zzzz' },
    });
    expect(screen.getByText('Nicio limbă nu se potrivește cu „zzzz”.')).toBeInTheDocument();
  });
});
