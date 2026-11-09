/**
 * Tests for the Language panel in Settings (story S1-E1-04; bundle FIX-3, which moved the language
 * menu out of the top bar and into the footer and Settings).
 *
 * Supabase is left unconfigured, so the choice stays in this browser; saving to the account is
 * covered by LanguageSelect.test.tsx (the same hook) and e2e/language.spec.ts.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppProviders } from '@/app/AppProviders';
import { createI18n } from '@/lib/i18n';

import { LanguageSettingsSection } from './LanguageSettingsSection';

vi.mock('@/lib/supabase', () => ({ getSupabaseClient: async () => null }));

/** Draws the panel on a Romanian screen, as a first visit does. */
function renderPanel() {
  render(
    <AppProviders i18n={createI18n('ro')}>
      <LanguageSettingsSection />
    </AppProviders>,
  );
}

afterEach(() => window.localStorage.clear());

describe('the Language panel in Settings', () => {
  it('offers each language by its own name, with the one on screen chosen', () => {
    renderPanel();

    expect(screen.getByRole('region', { name: 'Limbă' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Română' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked();
    // Each name keeps its language, so a screen reader pronounces it right (WCAG 3.1.2).
    expect(screen.getByText('Română').closest('label')).toHaveAttribute('lang', 'ro');
  });

  it('switches the whole screen to English when English is chosen', async () => {
    renderPanel();

    fireEvent.click(screen.getByRole('radio', { name: 'English' }));

    expect(await screen.findByRole('region', { name: 'Language' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
  });
});
