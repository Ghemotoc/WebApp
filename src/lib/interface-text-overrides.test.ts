/**
 * Tests for laying interface text overrides over the locale files (story S1-E11-18 criteria 9
 * and 10).
 */
import { describe, expect, it } from 'vitest';

import { createI18n } from './i18n';
import {
  installInterfaceTextOverrides,
  splitTextKey,
  type InterfaceTextOverride,
} from './interface-text-overrides';

/** Waits for the background fetch and its writes to finish. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('interface text overrides', () => {
  it('splits a key into its namespace and path', () => {
    expect(splitTextKey('common:nav.help')).toEqual({ namespace: 'common', path: 'nav.help' });
    expect(splitTextKey('nav.help')).toBeNull();
  });

  it('an override replaces the file text of its key', async () => {
    const i18n = createI18n('en');
    installInterfaceTextOverrides(i18n, () =>
      Promise.resolve([{ textKey: 'common:nav.help', text: 'Get help' }]),
    );
    await settle();
    expect(i18n.t('nav.help')).toBe('Get help');
  });

  it('an override for a key the files no longer have is ignored', async () => {
    const i18n = createI18n('en');
    installInterfaceTextOverrides(i18n, () =>
      Promise.resolve([{ textKey: 'common:no.such.key', text: 'Ghost' }]),
    );
    await settle();
    expect(i18n.exists('no.such.key')).toBe(false);
  });

  it('when the read fails the file text stays', async () => {
    const i18n = createI18n('en');
    const before = i18n.t('nav.help');
    installInterfaceTextOverrides(i18n, () => Promise.reject(new Error('offline')));
    await settle();
    expect(i18n.t('nav.help')).toBe(before);
  });

  it('a namespace that loads later gets its overrides when it is added', async () => {
    const i18n = createI18n('en');
    const overrides: InterfaceTextOverride[] = [{ textKey: 'later:greeting', text: 'Hello again' }];
    installInterfaceTextOverrides(i18n, () => Promise.resolve(overrides));
    await settle();
    i18n.addResourceBundle('en', 'later', { greeting: 'Hello' });
    expect(i18n.t('greeting', { ns: 'later' })).toBe('Hello again');
  });

  it('each language is fetched once and in its own language', async () => {
    const i18n = createI18n('en');
    const asked: string[] = [];
    installInterfaceTextOverrides(i18n, (locale) => {
      asked.push(locale);
      return Promise.resolve([]);
    });
    await i18n.changeLanguage('ro');
    await i18n.changeLanguage('en');
    await settle();
    expect(asked).toEqual(['en', 'ro']);
  });
});
