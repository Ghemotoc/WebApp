/**
 * NoticeEditor: Website › Notice banners for one market (story S1-E11-10).
 *
 * The list shows every notice with its state (live, scheduled, draft or ended) and its first
 * language's text; "New notice" starts one. Editing one opens NoticeForm with its history; "End
 * now" takes a live notice down from today. Only one notice shows per page at a time: the one
 * with the latest "show from" date (NoticeStrip).
 * Who shows it: WebsiteAdminPage. What it calls: useWebsiteEditor('notice').
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { noticeContentSchema, type NoticeContent } from '@/schemas/websiteContent';

import type { ContentVersion } from '../../api/websiteContentStore';
import { useWebsiteEditor, type WebsiteEditorState } from '../../hooks/useWebsiteEditor';
import {
  entryStateOf,
  groupByEntry,
  romaniaDateOf,
  sortEntryVersions,
  type EntryVersions,
} from '../../lib/versionState';

import { NoticeForm } from './NoticeForm';
import { VersionHistory } from './VersionHistory';

/** What the editor needs. */
interface NoticeEditorProps {
  marketCode: string;
  marketLanguages: string[];
}

/**
 * A version's content as a notice, or an empty one.
 *
 * @returns the notice
 */
function noticeOf(version: ContentVersion | null): NoticeContent {
  const parsed = noticeContentSchema.safeParse(version?.content);
  return parsed.success
    ? parsed.data
    : { texts: {}, link: null, noticeType: 'news', showOn: 'all' };
}

/**
 * A new notice's key, from the moment it was started ("notice-20261102-0914").
 *
 * @returns the key
 */
function newNoticeKey(): string {
  const stamp = new Date().toISOString().slice(0, 16).replaceAll(/[-:]/g, '').replace('T', '-');
  return `notice-${stamp}`;
}

/**
 * One notice in the list.
 *
 * @returns the row
 */
function NoticeRow({
  entryKey,
  entry,
  language,
  onEdit,
  state,
  marketCode,
}: {
  entryKey: string;
  entry: EntryVersions;
  language: string;
  onEdit: () => void;
  state: WebsiteEditorState;
  marketCode: string;
}) {
  const { t } = useTranslation('websiteAdmin');
  const shown = noticeOf(entry.draft ?? entry.scheduled ?? entry.live ?? entry.earlier[0] ?? null);
  const text = shown.texts[language] ?? Object.values(shown.texts)[0] ?? '';
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">
          {t(`states.${entryStateOf(entry)}`)}
        </span>
        <span className="block break-words text-body">{text}</span>
      </span>
      <span className="flex gap-2">
        <Button variant="secondary" aria-label={t('notices.editLabel', { text })} onClick={onEdit}>
          {t('edit')}
        </Button>
        {entry.live !== null && (
          <Button
            variant="destructive"
            disabled={state.isActing}
            aria-label={t('notices.endLabel', { text })}
            onClick={() =>
              void state.act({
                kind: 'remove',
                place: { kind: 'notice', entryKey, marketCode, languageCode: null },
              })
            }
          >
            {t('notices.end')}
          </Button>
        )}
      </span>
    </li>
  );
}

/** What the panel for one notice needs. */
interface NoticeEditPanelProps extends NoticeEditorProps {
  entryKey: string;
  entry: EntryVersions;
  today: string;
  state: WebsiteEditorState;
  onBack: () => void;
}

/**
 * The form and history for the notice being edited.
 *
 * @returns the panel
 */
function NoticeEditPanel({
  marketCode,
  marketLanguages,
  entryKey,
  entry,
  today,
  state,
  onBack,
}: NoticeEditPanelProps) {
  const { t } = useTranslation('websiteAdmin');
  // The form starts from the newest version: the draft, then the scheduled one, then the live one.
  const source = entry.draft ?? entry.scheduled ?? entry.live;
  return (
    <div className="flex flex-col gap-6">
      <Button variant="text" onClick={onBack}>
        {t('notices.back')}
      </Button>
      <NoticeForm
        key={`${entryKey}-${source?.updatedAt ?? 'new'}`}
        marketCode={marketCode}
        marketLanguages={marketLanguages}
        entryKey={entryKey}
        initial={noticeOf(source)}
        initialShowFrom={entry.draft?.showFrom ?? today}
        initialShowUntil={source?.showUntil ?? ''}
        today={today}
        state={state}
      />
      <VersionHistory
        entry={entry}
        state={state}
        describe={(version) => Object.values(noticeOf(version).texts)[0] ?? ''}
      />
    </div>
  );
}

/**
 * Renders the list, or the form for the notice being edited.
 *
 * @returns the editor
 */
export function NoticeEditor({ marketCode, marketLanguages }: NoticeEditorProps) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const state = useWebsiteEditor('notice', marketCode);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const today = romaniaDateOf(new Date());
  // Step 1: one entry per notice, its versions sorted into draft, live, scheduled and earlier.
  const entries = [...groupByEntry(state.versions).entries()].map(
    ([groupKey, versions]) =>
      [groupKey.split('|')[0] ?? '', sortEntryVersions(versions, today)] as const,
  );
  if (state.isLoading) return <p className="m-0 text-meta">{t('loading')}</p>;
  // Step 2: while one notice is open, show only its form (a new notice has no versions yet).
  if (editingKey !== null) {
    const entry = entries.find(([key]) => key === editingKey)?.[1] ?? sortEntryVersions([], today);
    return (
      <NoticeEditPanel
        marketCode={marketCode}
        marketLanguages={marketLanguages}
        entryKey={editingKey}
        entry={entry}
        today={today}
        state={state}
        onBack={() => setEditingKey(null)}
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={() => setEditingKey(newNoticeKey())}>{t('notices.new')}</Button>
      </div>
      {entries.length === 0 && <p className="m-0 text-meta">{t('notices.none')}</p>}
      <ul className="m-0 flex list-none flex-col p-0">
        {entries.map(([entryKey, entry]) => (
          <NoticeRow
            key={entryKey}
            entryKey={entryKey}
            entry={entry}
            language={i18n.language}
            onEdit={() => setEditingKey(entryKey)}
            state={state}
            marketCode={marketCode}
          />
        ))}
      </ul>
    </div>
  );
}
