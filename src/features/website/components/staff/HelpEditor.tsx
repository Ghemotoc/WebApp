/**
 * HelpEditor: Website › Help and questions for one market and language (story S1-E11-12).
 *
 * Two lists, help pages and questions, each with "New" and, per entry, Edit and Remove (Remove
 * takes it down from today; earlier versions stay for Restore). Editing opens HelpPageForm or
 * QuestionForm with the entry's history.
 * Who shows it: WebsiteAdminPage. What it calls: useWebsiteEditor for 'help_page' and 'question'.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import {
  helpPageContentSchema,
  questionContentSchema,
  type HelpPageContent,
  type QuestionContent,
} from '@/schemas/websiteContent';

import type { ContentVersion, EntryPlace } from '../../api/websiteContentStore';
import { useWebsiteEditor, type WebsiteEditorState } from '../../hooks/useWebsiteEditor';
import {
  entryStateOf,
  groupByEntry,
  romaniaDateOf,
  sortEntryVersions,
  type EntryVersions,
} from '../../lib/versionState';

import { HelpPageForm } from './HelpPageForm';
import { QuestionForm } from './QuestionForm';
import { VersionHistory } from './VersionHistory';

/** What the editor needs. */
interface HelpEditorProps {
  marketCode: string;
  language: string;
}

/** Which entry is open: a kind and a key, or a new one (key null). */
type OpenEntry = { kind: 'help_page' | 'question'; key: string | null } | null;

/**
 * A version's content as a help page, or an empty one.
 *
 * @returns the page
 */
function helpPageOf(version: ContentVersion | null): HelpPageContent {
  const parsed = helpPageContentSchema.safeParse(version?.content);
  return parsed.success ? parsed.data : { title: '', section: '', body: '', isLegal: false };
}

/**
 * A version's content as a question, or an empty one.
 *
 * @returns the question
 */
function questionOf(version: ContentVersion | null): QuestionContent {
  const parsed = questionContentSchema.safeParse(version?.content);
  return parsed.success
    ? parsed.data
    : { question: '', answer: '', position: 99, showOn: 'both', isLegal: false };
}

/**
 * One kind's entries in this language, sorted.
 *
 * @returns [key, versions] pairs
 */
function entriesIn(
  state: WebsiteEditorState,
  language: string,
  today: string,
): [string, EntryVersions][] {
  const inLanguage = state.versions.filter((version) => version.languageCode === language);
  return [...groupByEntry(inLanguage).entries()].map(([groupKey, versions]) => [
    groupKey.split('|')[0] ?? '',
    sortEntryVersions(versions, today),
  ]);
}

/** What one row of a list needs. */
interface EntryRowProps {
  entryKey: string;
  entry: EntryVersions;
  title: string;
  state: WebsiteEditorState;
  onOpen: (key: string | null) => void;
  place: EntryPlace;
}

/**
 * One help page or question in its list: its title, its state, Edit and (while live) Remove.
 *
 * @returns the row
 */
function EntryRow({ entryKey, entry, title, state, onOpen, place }: EntryRowProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-2">
      <span className="min-w-0 flex-1 break-words text-body">
        {title} <span className="text-sm text-meta">· {t(`states.${entryStateOf(entry)}`)}</span>
      </span>
      <span className="flex gap-2">
        <Button
          variant="secondary"
          aria-label={t('editLabel', { name: title })}
          onClick={() => onOpen(entryKey)}
        >
          {t('edit')}
        </Button>
        {entry.live !== null && (
          <Button
            variant="destructive"
            disabled={state.isActing}
            aria-label={t('removeLabel', { name: title })}
            onClick={() => void state.act({ kind: 'remove', place })}
          >
            {t('remove')}
          </Button>
        )}
      </span>
    </li>
  );
}

/**
 * One list (help pages or questions) with its New button.
 *
 * @returns the section
 */
function EntryList({
  kind,
  entries,
  state,
  titleOf,
  onOpen,
  marketCode,
  language,
}: {
  kind: 'help_page' | 'question';
  entries: [string, EntryVersions][];
  state: WebsiteEditorState;
  titleOf: (entry: EntryVersions) => string;
  onOpen: (key: string | null) => void;
  marketCode: string;
  language: string;
}) {
  const { t } = useTranslation('websiteAdmin');
  const listName = kind === 'help_page' ? 'help' : 'questions';
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`${listName}-list`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${listName}-list`} className="m-0 font-heading text-[22px] font-bold text-heading">
          {t(`${listName}.heading`)}
        </h2>
        <Button variant="secondary" onClick={() => onOpen(null)}>
          {t(`${listName}.new`)}
        </Button>
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {entries.map(([key, entry]) => (
          <EntryRow
            key={key}
            entryKey={key}
            entry={entry}
            title={titleOf(entry)}
            state={state}
            onOpen={onOpen}
            place={{ kind, entryKey: key, marketCode, languageCode: language }}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * The form and history for the open entry.
 *
 * @returns the editor for one entry
 */
function OpenEntryEditor({
  open,
  entry,
  state,
  marketCode,
  language,
  today,
  onBack,
}: {
  open: NonNullable<OpenEntry>;
  entry: EntryVersions;
  state: WebsiteEditorState;
  marketCode: string;
  language: string;
  today: string;
  onBack: () => void;
}) {
  const { t } = useTranslation('websiteAdmin');
  const source = entry.draft ?? entry.scheduled ?? entry.live;
  const formKey = `${open.kind}-${open.key ?? 'new'}-${source?.updatedAt ?? ''}`;
  const shared = {
    marketCode,
    language,
    entryKey: open.key,
    initialShowFrom: entry.draft?.showFrom ?? today,
    today,
    state,
  };
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="text" onClick={onBack}>
          {t('help.back')}
        </Button>
      </div>
      {open.kind === 'help_page' ? (
        <HelpPageForm key={formKey} {...shared} initial={helpPageOf(source)} />
      ) : (
        <QuestionForm key={formKey} {...shared} initial={questionOf(source)} />
      )}
      <VersionHistory
        entry={entry}
        state={state}
        describe={(version) =>
          open.kind === 'help_page' ? helpPageOf(version).title : questionOf(version).question
        }
      />
    </div>
  );
}

/**
 * Renders the two lists, or the open entry.
 *
 * @returns the editor
 */
export function HelpEditor({ marketCode, language }: HelpEditorProps) {
  const { t } = useTranslation('websiteAdmin');
  const pages = useWebsiteEditor('help_page', marketCode);
  const questions = useWebsiteEditor('question', marketCode);
  const [open, setOpen] = useState<OpenEntry>(null);
  const today = romaniaDateOf(new Date());
  if (pages.isLoading || questions.isLoading)
    return <p className="m-0 text-meta">{t('loading')}</p>;
  const pageEntries = entriesIn(pages, language, today);
  const questionEntries = entriesIn(questions, language, today).sort(
    (first, second) =>
      questionOf(first[1].live ?? first[1].draft).position -
      questionOf(second[1].live ?? second[1].draft).position,
  );
  if (open !== null) {
    const state = open.kind === 'help_page' ? pages : questions;
    const list = open.kind === 'help_page' ? pageEntries : questionEntries;
    const entry = list.find(([key]) => key === open.key)?.[1] ?? sortEntryVersions([], today);
    return (
      <OpenEntryEditor
        open={open}
        entry={entry}
        state={state}
        marketCode={marketCode}
        language={language}
        today={today}
        onBack={() => setOpen(null)}
      />
    );
  }
  const latestOf = (entry: EntryVersions) =>
    entry.draft ?? entry.scheduled ?? entry.live ?? entry.earlier[0] ?? null;
  return (
    <div className="flex flex-col gap-8">
      <EntryList
        kind="help_page"
        entries={pageEntries}
        state={pages}
        titleOf={(entry) => helpPageOf(latestOf(entry)).title}
        onOpen={(key) => setOpen({ kind: 'help_page', key })}
        marketCode={marketCode}
        language={language}
      />
      <EntryList
        kind="question"
        entries={questionEntries}
        state={questions}
        titleOf={(entry) => questionOf(latestOf(entry)).question}
        onOpen={(key) => setOpen({ kind: 'question', key })}
        marketCode={marketCode}
        language={language}
      />
    </div>
  );
}
