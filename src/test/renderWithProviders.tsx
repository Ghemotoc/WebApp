/**
 * renderWithProviders: draws a component with the same providers the app uses (story S1-E1-03).
 *
 * Who calls it: component tests. It wraps the component in AppProviders with a fresh translation
 * instance in the language asked for (Romanian by default, as the app starts).
 */
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

import { AppProviders } from '@/app/AppProviders';
import { createI18n, type SupportedLanguage } from '@/lib/i18n';

/**
 * Renders the element inside the app's providers.
 *
 * @param element - what to draw
 * @param language - the interface language, Romanian unless a test asks for English
 * @returns Testing Library's render result
 */
export function renderWithProviders(element: ReactElement, language: SupportedLanguage = 'ro') {
  return render(<AppProviders i18n={createI18n(language)}>{element}</AppProviders>);
}
