/**
 * Tests for the password strength meter (bundle G3 COMPONENTS; handoff "Fields and forms").
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
    expect(word).toHaveTextContent('Password strength: Weak');
    expect(word).toHaveAttribute('aria-live', 'polite');
  });

  it('fills more segments for a stronger password', () => {
    const { container } = renderWithProviders(
      <PasswordStrengthMeter password="a much longer pass phrase 42!" id="strength" />,
      'en',
    );
    const meter = container.querySelector('[data-password-strength]');
    expect(meter).toHaveAttribute('data-password-strength', 'very-strong');
    expect(screen.getByText('Very strong')).toBeInTheDocument();
    const filled = meter?.querySelectorAll('span[style]') ?? [];
    expect(filled).toHaveLength(4);
  });

  it('speaks Romanian', () => {
    renderWithProviders(<PasswordStrengthMeter password="short" id="strength" />, 'ro');
    expect(document.getElementById('strength')).toHaveTextContent('Puterea parolei: Slabă');
  });
});
