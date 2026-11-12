/**
 * Tests for the password strength meter: one bar and one line (PASSWORD-1; bundle G3 colours).
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { PasswordStrengthMeter } from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it('shows nothing while the field is empty', () => {
    const { container } = renderWithProviders(
      <PasswordStrengthMeter password="" id="strength" />,
      'en',
    );
    expect(container.querySelector('[data-password-strength]')).toBeNull();
  });

  it('says the step in words, so it never rests on colour alone', () => {
    renderWithProviders(<PasswordStrengthMeter password="short" id="strength" />, 'en');
    const word = document.getElementById('strength');
    expect(word).toHaveTextContent('Password strength: Weak. Needs 10 characters or more.');
    expect(word).toHaveAttribute('aria-live', 'polite');
  });

  it('says only the step once the password is long enough', () => {
    renderWithProviders(<PasswordStrengthMeter password="tenletters" id="strength" />, 'en');
    const line = document.getElementById('strength');
    expect(line).toHaveTextContent('Password strength: Fair');
    expect(line?.querySelector('svg')).toBeNull();
  });

  it('fills the whole bar and shows a tick for a very strong password', () => {
    const { container } = renderWithProviders(
      <PasswordStrengthMeter password="a much longer pass phrase 42!" id="strength" />,
      'en',
    );
    const meter = container.querySelector('[data-password-strength]');
    expect(meter).toHaveAttribute('data-password-strength', 'very-strong');
    expect(screen.getByText('Very strong')).toBeInTheDocument();
    expect(meter?.querySelector('[data-strength-fill]')).toHaveStyle({ width: '100%' });
    expect(document.getElementById('strength')?.querySelector('svg')).not.toBeNull();
  });

  it('speaks Romanian', () => {
    renderWithProviders(<PasswordStrengthMeter password="short" id="strength" />, 'ro');
    expect(document.getElementById('strength')).toHaveTextContent('Puterea parolei: Slabă. Minimum 10 caractere.');
  });
});
