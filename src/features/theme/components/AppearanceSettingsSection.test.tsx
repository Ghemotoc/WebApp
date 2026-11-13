/**
 * Unit tests for Settings › Appearance (bundle G2 THEMES). Who runs it: `npm test` (Vitest). There
 * is no database here, so a change is kept on this device, as for someone signed out.
 */
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readHighContrastChoice } from '@/lib/highContrast';
import { readStoredLookChoice } from '@/lib/looks';
import { readLessMotionChoice } from '@/lib/motion';
import { renderWithProviders } from '@/test/renderWithProviders';

import { getAppearance, replaceAppearance } from '../lib/appearanceStore';

import { AppearanceSettingsSection } from './AppearanceSettingsSection';

afterEach(() => {
  replaceAppearance({
    mode: 'device',
    look: 'lilac',
    isSeasonalOn: false,
    isLessMotionOn: false,
    isHighContrastOn: false,
  });
  window.localStorage.clear();
  vi.unstubAllGlobals();
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

  it('keeps Less motion off until the member turns it on, then remembers it', () => {
    renderWithProviders(<AppearanceSettingsSection />, 'en');
    const lessMotion = screen.getByRole('switch', { name: 'Less motion' });
    expect(lessMotion).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(lessMotion);
    expect(lessMotion).toHaveAttribute('aria-checked', 'true');
    expect(getAppearance().isLessMotionOn).toBe(true);
    expect(readLessMotionChoice()).toBe(true);
    fireEvent.click(lessMotion);
    expect(lessMotion).toHaveAttribute('aria-checked', 'false');
    expect(readLessMotionChoice()).toBe(false);
  });

  it('shows Less motion as on, and says why, on a device that already asks for it', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    renderWithProviders(<AppearanceSettingsSection />, 'en');
    const lessMotion = screen.getByRole('switch', { name: 'Less motion' });
    expect(lessMotion).toHaveAttribute('aria-checked', 'true');
    expect(lessMotion).toBeDisabled();
    expect(screen.getByText(/This device already asks for less motion/)).toBeInTheDocument();
    // The member's own choice is untouched: it is the device that asks.
    expect(getAppearance().isLessMotionOn).toBe(false);
  });

  it('keeps High contrast off until the member turns it on, then remembers it', () => {
    renderWithProviders(<AppearanceSettingsSection />, 'en');
    const highContrast = screen.getByRole('switch', { name: 'High contrast' });
    expect(highContrast).toHaveAttribute('aria-checked', 'false');
    expect(highContrast).toHaveAccessibleDescription(/Plain white pages, black at night/);
    fireEvent.click(highContrast);
    expect(highContrast).toHaveAttribute('aria-checked', 'true');
    expect(getAppearance().isHighContrastOn).toBe(true);
    expect(readHighContrastChoice()).toBe(true);
    fireEvent.click(highContrast);
    expect(highContrast).toHaveAttribute('aria-checked', 'false');
    expect(readHighContrastChoice()).toBe(false);
  });

  it('leaves the picked theme alone when High contrast goes on', () => {
    renderWithProviders(<AppearanceSettingsSection />, 'en');
    fireEvent.click(screen.getByRole('radio', { name: 'Sea glass' }));
    fireEvent.click(screen.getByRole('switch', { name: 'High contrast' }));
    expect(getAppearance().look).toBe('seaglass');
    expect(screen.getByRole('radio', { name: 'Sea glass' })).toBeChecked();
  });

  it('shows High contrast as on, and says why, on a device that already asks for it', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    renderWithProviders(<AppearanceSettingsSection />, 'en');
    const highContrast = screen.getByRole('switch', { name: 'High contrast' });
    expect(highContrast).toHaveAttribute('aria-checked', 'true');
    expect(highContrast).toBeDisabled();
    expect(screen.getByText(/This device already asks for more contrast/)).toBeInTheDocument();
    // The member's own choice is untouched: it is the device that asks.
    expect(getAppearance().isHighContrastOn).toBe(false);
  });

  it('is in Romanian with ș and ț', () => {
    expect.hasAssertions();
    renderWithProviders(<AppearanceSettingsSection />, 'ro');
    expect(screen.getByRole('switch', { name: 'Teme de sezon' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Mai puțină mișcare' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Contrast ridicat' })).toBeInTheDocument();
    expect(screen.getByText(/Modul de noapte arată la fel/)).toBeInTheDocument();
  });
});
