/**
 * TextKeyEditor: one interface text key, its languages side by side (story S1-E11-18 criteria 2
 * and 11). Legal wording gets the reminder that it must match the legal documents.
 * Who shows it: InterfaceTextTab and EmailTemplatesTab.
 * What it calls: useInterfaceTextEditor(key), then one LocaleTextPanel per language.
 */
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';
import { romaniaDateOf } from '@/features/website/lib/versionState';

import { useInterfaceTextEditor } from '../hooks/useInterfaceTextEditor';
import { isLegalWording, type CatalogueEntry } from '../lib/localeCatalogue';
import { sortLocaleVersions } from '../lib/textVersionState';

import { LocaleTextPanel } from './LocaleTextPanel';

/** The languages edited side by side, Romanian first (decided 17 Oct 2026, 11:48). */
const editedLocales = ['ro', 'en'] as const;

/**
 * Renders the editor for one key.
 *
 * @returns the editor
 */
export function TextKeyEditor({ entry }: { entry: CatalogueEntry }) {
  const { t } = useTranslation('websiteAdmin');
  const state = useInterfaceTextEditor(entry.textKey);
  const today = romaniaDateOf(new Date());
  if (state.isLoading) return <p className="m-0 text-meta">{t('loading')}</p>;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="m-0 font-mono text-base break-all text-heading">{entry.textKey}</h2>
      {isLegalWording(entry) && <Notice tone="warning">{t('legal.reminder')}</Notice>}
      <div className="grid gap-6 lg:grid-cols-2">
        {editedLocales.map((locale) => {
          const versions = sortLocaleVersions(state.versions, locale, today);
          return (
            <LocaleTextPanel
              // A new version from the server starts the panel afresh.
              key={`${locale}-${versions.draft?.updatedAt ?? ''}-${versions.live?.id ?? ''}`}
              textKey={entry.textKey}
              locale={locale}
              fileText={entry.fileTexts[locale] ?? ''}
              versions={versions}
              today={today}
              state={state}
            />
          );
        })}
      </div>
    </div>
  );
}
