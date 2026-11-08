/**
 * Unit tests for Settings › Appearance (bundle G2 THEMES). Who runs it: `npm test` (Vitest). There
 * is no database here, so a change is kept on this device, as for someone signed out.
 */
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { readStoredLookChoice } from '@/lib/looks';
import { renderWithProviders } from '@/test/renderWithProviders';

import { getAppearance, replaceAppearance } from '../lib/appearanceStore';

import { AppearanceSettingsSection } from './AppearanceSettingsSection';

afterEach(() => {
  replaceAppearance({ mode: 'device', look: 'lilac', isSeasonalOn: false });
  window.localStorage.clear();
});

describe('AppearanceSettingsSection', () => {
  it('offers the six themes with Lilac mist picked by default', () => {
    renderWithProviders(<AppearanceSettingsSection />, 'en');
    const themes = screen.getByRole('group', { name: 'Theme' });
    expect(themes).toBeInTheDocument();
    expect(
      screen.getAllByRole('radio', { name: /mist|sorbet|glass|butter|floss|cream/ }),
    ).toHaveLength(6);
    expect(screen.getByRole('radio', { name: 'Lilac mist' })).toBeChecked();
  });

  it('shows and remembers a theme the moment it is picked', () => {
    renderWithProviders(<AppearanceSettingsSection />, 'en');
    fireEvent.click(screen.getByRole('radio', { name: 'Peach sorbet' }));
    expect(screen.getByRole('radio', { name: 'Peach sorbet' })).toBeChecked();
    expect(getAppearance().look).toBe('sorbet');
    expect(readStoredLookChoice().look).toBe('sorbet');
  });

  it('changes the mode from the Mode group', () => {
    renderWithProviders(<AppearanceSettingsSection />, 'en');
    fireEvent.click(screen.getByRole('radio', { name: 'Night' }));
    expect(getAppearance().mode).toBe('night');
  });

  it('keeps seasonal themes off until the member turns them on', () => {
    renderWithProviders(<AppearanceSettingsSection />, 'en');
    const seasonal = screen.getByRole('switch', { name: 'Seasonal themes' });
    expect(seasonal).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(seasonal);
    expect(seasonal).toHaveAttribute('aria-checked', 'true');
    expect(readStoredLookChoice().isSeasonalOn).toBe(true);
  });

  it('is in Romanian with ș and ț', () => {
    renderWithProviders(<AppearanceSettingsSection />, 'ro');
    expect(screen.getByRole('switch', { name: 'Teme de sezon' })).toBeInTheDocument();
    expect(screen.getByText(/Modul de noapte arată la fel/)).toBeInTheDocument();
  });
});
