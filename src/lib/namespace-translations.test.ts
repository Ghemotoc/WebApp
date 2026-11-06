/**
 * Tests for the shared feature-text helper (QA-5, finding R3).
 * Who runs it: `npm test` (Vitest).
 */
import i18next from 'i18next';
import { describe, expect, it } from 'vitest';

import { createNamespaceTranslations } from './namespace-translations';

/** A fresh i18n instance with no text at all, so each test starts clean. */
async function emptyInstance() {
  const instance = i18next.createInstance();
  await instance.init({ lng: 'ro', fallbackLng: 'ro', resources: {} });
  return instance;
}

describe('createNamespaceTranslations', () => {
  it('adds the Romanian and English text under the namespace', async () => {
    const instance = await emptyInstance();
    const text = createNamespaceTranslations(
      'example',
      { greeting: 'Salut' },
      { greeting: 'Hello' },
    );
    text.register(instance);
    expect(instance.getFixedT('ro', 'example')('greeting')).toBe('Salut');
    expect(instance.getFixedT('en', 'example')('greeting')).toBe('Hello');
  });

  it('registering a second time changes nothing, so a staff override laid on top stays', async () => {
    const instance = await emptyInstance();
    const text = createNamespaceTranslations(
      'example',
      { greeting: 'Salut' },
      { greeting: 'Hello' },
    );
    text.register(instance);
    instance.addResource('ro', 'example', 'greeting', 'Bună');
    text.register(instance);
    expect(instance.getFixedT('ro', 'example')('greeting')).toBe('Bună');
  });
});
