/**
 * ClassicsImport: "Import a research list" on /staff/classics (story S1-E11-16 AC 7, part 16b):
 * staff open one of the CSV lists from content/classics (research G5), and every row becomes a
 * draft work with its details filled in. Its text still has to be added and its details checked
 * before it can be published.
 *
 * Who shows it: ClassicsPage. What it calls: lib/parseClassicsCsv.ts to read the file and
 * useClassicsImport → admin_import_classics(), which checks every row again. Plain components,
 * no doodles (staff screens).
 */
import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import type { ImportResult } from '../../api/classicsImport';
import { useClassicsImport } from '../../hooks/useClassicsImport';
import { parseClassicsCsv } from '../../lib/parseClassicsCsv';

/** What went wrong before anything reached the database. */
type FileProblem = { kind: 'unreadable' } | { kind: 'columns'; missing: string[] } | null;

/**
 * What the import did: the counts, then each refused row with its line and reason.
 *
 * @param props.result - from admin_import_classics()
 * @returns the summary
 */
function ImportSummary({ result }: { result: ImportResult }) {
  const { t } = useTranslation('staff');
  return (
    <div className="flex flex-col gap-2">
      <Notice tone={result.refused.length === 0 ? 'success' : 'info'}>
        {t('classics.import.summary', {
          count: result.added,
          already: result.alreadyListed,
          refused: result.refused.length,
        })}
      </Notice>
      {result.refused.length > 0 && (
        <ul
          aria-label={t('classics.import.refusedHeading')}
          className="m-0 flex list-none flex-col p-0 text-sm text-body"
        >
          {result.refused.map((row) => (
            <li key={row.line} className="border-b border-border py-1.5">
              {t('classics.import.refusedRow', {
                line: row.line,
                title: row.title,
                reason: t(`classics.import.reasons.${row.reason}`, {
                  defaultValue: t('classics.import.reasons.row_invalid'),
                }),
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The message for a file that couldn't be used, or for a refused import.
 *
 * @returns the notice, or nothing
 */
function ImportProblem({
  fileProblem,
  failure,
}: {
  fileProblem: FileProblem;
  failure: string | null;
}) {
  const { t } = useTranslation('staff');
  if (fileProblem?.kind === 'unreadable') {
    return <Notice tone="error">{t('classics.import.unreadable')}</Notice>;
  }
  if (fileProblem?.kind === 'columns') {
    return (
      <Notice tone="error">
        {t('classics.import.missingColumns', { columns: fileProblem.missing.join(', ') })}
      </Notice>
    );
  }
  if (failure !== null) return <Notice tone="error">{t(`classics.failures.${failure}`)}</Notice>;
  return null;
}

/**
 * Renders the import panel.
 *
 * @returns the panel
 */
export function ClassicsImport() {
  const { t } = useTranslation('staff');
  const importing = useClassicsImport();
  const [fileProblem, setFileProblem] = useState<FileProblem>(null);

  /** Reads the chosen file and sends its rows, or says why it can't be used. */
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    let text: string;
    try {
      text = await file.text();
    } catch {
      setFileProblem({ kind: 'unreadable' });
      return;
    }
    const parsed = parseClassicsCsv(text);
    if (!parsed.isValid) {
      setFileProblem({ kind: 'columns', missing: parsed.missingColumns });
      return;
    }
    setFileProblem(null);
    importing.importRows(parsed.rows);
  }

  return (
    <section
      aria-labelledby="classics-import-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="classics-import-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('classics.import.heading')}
      </h2>
      <p className="m-0 text-body">{t('classics.import.intro')}</p>
      <label className="flex flex-col gap-1 text-sm text-body">
        {t('classics.import.file')}
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={importing.isImporting}
          onChange={(event) => void handleFile(event)}
        />
      </label>
      {importing.isImporting && (
        <p className="m-0 text-sm text-meta">{t('classics.import.busy')}</p>
      )}
      <ImportProblem fileProblem={fileProblem} failure={importing.failure} />
      {importing.result !== null && fileProblem === null && (
        <ImportSummary result={importing.result} />
      )}
    </section>
  );
}
