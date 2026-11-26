/**
 * ListLinesSection: "Lines under the title" on Staff › Website › Genre and tag pages, where the
 * owner and admins write the one short sentence under a genre or tag page's title, per language
 * (BOOKS-A06 and BOOKS-A09, user stories 1.6 and 1.9; boards A06-ReadGenre and A09-ReadTag;
 * Robert, 25 Nov 2026: every widget the boards draw is built, with the way to edit it here).
 *
 * The saved lines come first, each with Edit, then the form. Website text comes only from staff,
 * never from the locale files (decided 17 Oct 2026, 19:14). Every change is in the audit log,
 * linked as "Staff history".
 * Who shows it: ListBackgroundsTab. What it calls: useListPageLines, useSaveListPageLine and
 * ListLineForm.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { languageNameIn } from '@/lib/language-names';

import {
  PageLineSaveError,
  type ListPageLine,
  type PageLinePlace,
} from '../../api/staff/listPageLines';
import { useListPageLines, useSaveListPageLine } from '../../hooks/useListPageLines';
import { mainContentLanguage } from '../../hooks/useInterfaceLanguages';
import { pageNameFor } from '../../lib/listBackgrounds';

import { ListLineForm } from './ListLineForm';

/** What the card says after a change: nothing, saved, cleared, or a failure word. */
type LineMessage = 'none' | 'saved' | 'cleared' | PageLineSaveError['failure'];

/**
 * One saved line, with who wrote it and Edit.
 *
 * @returns a list item
 */
function SavedLineRow({ row, onEdit }: { row: ListPageLine; onEdit: () => void }) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const place = t('listLines.place', {
    name: pageNameFor(row, t),
    language: languageNameIn(row.language, i18n.language),
  });
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <span className="flex min-w-0 flex-col">
        <b className="break-words text-heading">{place}</b>
        <span lang={row.language} className="break-words">
          {row.line}
        </span>
        {row.setBy !== null && (
          <span className="text-sm text-meta">{t('listLines.setBy', { handle: row.setBy })}</span>
        )}
      </span>
      <Button
        type="button"
        variant="secondary"
        aria-label={t('listLines.editLabel', { place })}
        onClick={onEdit}
      >
        {t('listBackgrounds.edit')}
      </Button>
    </li>
  );
}

/**
 * The saved lines, genres first, each with Edit.
 *
 * @param props.lines - every saved line
 * @param props.onEdit - opens the form on that line
 * @returns the list, or nothing when no line is saved
 */
function SavedLines({
  lines,
  onEdit,
}: {
  lines: readonly ListPageLine[];
  onEdit: (row: ListPageLine) => void;
}) {
  const { t } = useTranslation('websiteAdmin');
  if (lines.length === 0) return null;
  return (
    <ul className="m-0 list-none p-0" aria-label={t('listLines.savedLabel')}>
      {lines.map((row) => (
        <SavedLineRow
          key={`${row.kind}:${row.key}:${row.language}`}
          row={row}
          onEdit={() => onEdit(row)}
        />
      ))}
    </ul>
  );
}

/**
 * The message after a change: saved, cleared or the failure, in words.
 *
 * @returns the notice, or nothing
 */
function LineNotice({ message }: { message: LineMessage }) {
  const { t } = useTranslation('websiteAdmin');
  if (message === 'none') return null;
  if (message === 'saved' || message === 'cleared') {
    return <Notice tone="success">{t(`listLines.${message}`)}</Notice>;
  }
  return <Notice tone="error">{t(`listLines.failures.${message}`)}</Notice>;
}

/**
 * Renders the card.
 *
 * @returns the saved lines, the form and the messages
 */
export function ListLinesSection() {
  const { t } = useTranslation('websiteAdmin');
  const lines = useListPageLines();
  const save = useSaveListPageLine();
  const [start, setStart] = useState<PageLinePlace>({
    kind: 'category',
    key: 'fiction',
    language: mainContentLanguage,
  });
  const [message, setMessage] = useState<LineMessage>('none');
  const saved = lines.data ?? [];

  /** Saves the line and says how it went; an empty line takes it off. */
  const saveLine = (place: PageLinePlace, line: string) => {
    setMessage('none');
    save.mutate(
      { place, line },
      {
        onSuccess: () => setMessage(line.trim() === '' ? 'cleared' : 'saved'),
        onError: (error) =>
          setMessage(error instanceof PageLineSaveError ? error.failure : 'unreachable'),
      },
    );
  };

  return (
    <section
      aria-labelledby="list-lines-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="list-lines-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('listLines.heading')}
      </h2>
      <p className="m-0 text-sm text-body">{t('listLines.note')}</p>
      {lines.isError && <Notice tone="error">{t('failures.unreachable')}</Notice>}
      <SavedLines
        lines={saved}
        onEdit={(row) => {
          setMessage('none');
          setStart({ kind: row.kind, key: row.key, language: row.language });
        }}
      />
      <LineNotice message={message} />
      {lines.isSuccess && (
        <ListLineForm
          key={`${start.kind}:${start.key}:${start.language}`}
          lines={saved}
          start={start}
          isBusy={save.isPending}
          onSave={saveLine}
        />
      )}
      <Link
        to="/staff/audit-log?action=website.list_line_set"
        className="inline-flex min-h-6 w-fit items-center text-sm text-link underline"
      >
        {t('listBackgrounds.history')}
      </Link>
    </section>
  );
}
