/**
 * InterfaceTextTab: Staff › Website › Interface text: every key from the locale files, searchable
 * by the words on screen or by key, 50 at a time; opening one shows its editor (story S1-E11-18
 * criterion 1). EmailTemplatesTab uses the same list for the email keys (S1-E11-19).
 * Who shows it: WebsiteAdminPage. What it calls: the catalogue, then TextKeyEditor.
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import { buildCatalogue, searchCatalogue, type CatalogueEntry } from '../lib/localeCatalogue';

import { TextKeyEditor } from './TextKeyEditor';

/** How many keys show at a time. */
const pageSize = 50;

/** What the tab needs. */
interface InterfaceTextTabProps {
  /** Only keys of these namespaces (["email"] for the email templates); every key when left out. */
  namespaces?: string[];
}

/**
 * One key in the list.
 *
 * @returns the row
 */
function KeyRow({
  entry,
  language,
  onOpen,
}: {
  entry: CatalogueEntry;
  language: string;
  onOpen: () => void;
}) {
  const { t } = useTranslation('websiteAdmin');
  const shown = entry.fileTexts[language] ?? entry.fileTexts.ro ?? '';
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-2">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-mono text-xs break-all text-meta">{entry.textKey}</span>
        <span lang={language} className="break-words text-body">
          {shown}
        </span>
      </span>
      <Button
        variant="secondary"
        aria-label={t('editLabel', { name: entry.textKey })}
        onClick={onOpen}
      >
        {t('edit')}
      </Button>
    </li>
  );
}

/**
 * The search, the keys that match, 50 at a time, and "Show 50 more".
 *
 * @returns the list
 */
function KeyList({
  catalogue,
  onOpen,
}: {
  catalogue: CatalogueEntry[];
  onOpen: (textKey: string) => void;
}) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const [search, setSearch] = useState('');
  const [shownCount, setShownCount] = useState(pageSize);
  const matches = searchCatalogue(catalogue, search);
  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-[480px]">
        <TextInput
          id="text-search"
          type="search"
          label={t('interfaceText.search')}
          hint={t('interfaceText.searchHint')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setShownCount(pageSize);
          }}
        />
      </div>
      <p className="m-0 text-sm text-meta" aria-live="polite">
        {t('interfaceText.count', {
          shown: Math.min(shownCount, matches.length),
          total: matches.length,
        })}
      </p>
      <ul className="m-0 flex list-none flex-col p-0">
        {matches.slice(0, shownCount).map((entry) => (
          <KeyRow
            key={entry.textKey}
            entry={entry}
            language={i18n.language}
            onOpen={() => onOpen(entry.textKey)}
          />
        ))}
      </ul>
      {shownCount < matches.length && (
        <div>
          <Button variant="secondary" onClick={() => setShownCount(shownCount + pageSize)}>
            {t('interfaceText.more')}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Renders the search, the list or the open key.
 *
 * @returns the tab
 */
export function InterfaceTextTab({ namespaces }: InterfaceTextTabProps) {
  const { t } = useTranslation('websiteAdmin');
  const [openKey, setOpenKey] = useState<string | null>(null);
  // Step 1: every key of the wanted namespaces, built once from the bundled files.
  const catalogue = useMemo(
    () =>
      buildCatalogue().filter(
        (entry) => namespaces === undefined || namespaces.includes(entry.namespace),
      ),
    [namespaces],
  );
  const open = catalogue.find((entry) => entry.textKey === openKey);
  // Step 2: an open key shows only its editor.
  if (open !== undefined) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <Button variant="text" onClick={() => setOpenKey(null)}>
            {t('interfaceText.back')}
          </Button>
        </div>
        <TextKeyEditor entry={open} />
      </div>
    );
  }
  return <KeyList catalogue={catalogue} onOpen={setOpenKey} />;
}
