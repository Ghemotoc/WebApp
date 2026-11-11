/**
 * HelpPageForm: one help page being written (story S1-E11-12 criteria 1, 5, 6 and 7).
 *
 * A web address (only for a new page; an address never changes once used), a title, a section and
 * the body in the safe Markdown subset, with a preview beside it, then the search and share
 * fields (S1-E11-37). Legal wording is marked, and the
 * editor reminds the admin it must match the legal documents. Links to our own pages are checked
 * when publishing; a broken one is named.
 * Who shows it: HelpEditor. What it calls: the editor state's act().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Json } from '@/lib/database.types';
import { helpPageLimits, type HelpPageContent } from '@/schemas/websiteContent';

import type { WebsiteEditorState } from '../../hooks/useWebsiteEditor';
import { problemAt } from '../../lib/fieldProblems';

import { AddressField } from './AddressField';
import { CountedField } from './CountedField';
import { LegalWordingBox } from './LegalWordingBox';
import { MarkdownField } from './MarkdownField';
import { PublishControls } from './PublishControls';
import { SearchFieldsBox } from './SearchFieldsBox';

/** What the form needs. */
export interface HelpPageFormProps {
  marketCode: string;
  language: string;
  /** The page's address, or null for a new page (the admin types one). */
  entryKey: string | null;
  initial: HelpPageContent;
  initialShowFrom: string;
  today: string;
  state: WebsiteEditorState;
}

/** What the page's fields need. */
interface HelpPageFieldsProps {
  page: HelpPageContent;
  language: string;
  labelOf: (path: string) => string;
  problemOf: (path: string) => string | null;
  onChange: (next: HelpPageContent) => void;
}

/**
 * The page's title and section (side by side from 768 px), the legal wording box and the body
 * with its preview.
 *
 * @returns the fields
 */
function HelpPageFields({ page, language, labelOf, problemOf, onChange }: HelpPageFieldsProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <CountedField
          id="help-title"
          label={labelOf('title')}
          value={page.title}
          limit={helpPageLimits.title}
          lang={language}
          serverProblem={problemOf('title')}
          onChange={(title) => onChange({ ...page, title })}
        />
        <CountedField
          id="help-section"
          label={labelOf('section')}
          value={page.section}
          limit={helpPageLimits.section}
          lang={language}
          serverProblem={problemOf('section')}
          onChange={(section) => onChange({ ...page, section })}
        />
      </div>
      <LegalWordingBox
        isLegal={page.isLegal}
        onChange={(isLegal) => onChange({ ...page, isLegal })}
      />
      <MarkdownField
        id="help-body"
        label={labelOf('body')}
        value={page.body}
        limit={helpPageLimits.body}
        rows={14}
        language={language}
        serverProblem={problemOf('body')}
        onChange={(body) => onChange({ ...page, body })}
      />
      {/* The search and share fields (S1-E11-37): empty ones use the title and first lines. */}
      <SearchFieldsBox
        idPrefix="help"
        search={page.search}
        language={language}
        problemOf={problemOf}
        onChange={(search) => onChange({ ...page, search })}
      />
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the fields, the preview and the publish block
 */
export function HelpPageForm({
  marketCode,
  language,
  entryKey,
  initial,
  initialShowFrom,
  today,
  state,
}: HelpPageFormProps) {
  const { t } = useTranslation('websiteAdmin');
  const [page, setPage] = useState(initial);
  const [address, setAddress] = useState(entryKey ?? '');
  const [showFrom, setShowFrom] = useState(initialShowFrom);
  const problemOf = (path: string) => problemAt(state.failure, path);
  const labelOf = (path: string) => t(`help.fields.${path}`, { defaultValue: path });
  const draft = {
    kind: 'help_page' as const,
    entryKey: address,
    marketCode,
    languageCode: language,
    content: page as unknown as Json,
    showFrom,
    showUntil: null,
  };
  return (
    <div className="flex flex-col gap-4">
      {entryKey === null && (
        <AddressField
          id="help-address"
          label={t('help.fields.address')}
          hint={t('help.addressHint')}
          value={address}
          onChange={setAddress}
        />
      )}
      <HelpPageFields
        page={page}
        language={language}
        labelOf={labelOf}
        problemOf={problemOf}
        onChange={setPage}
      />
      <PublishControls
        idPrefix="help"
        draft={draft}
        onShowFromChange={setShowFrom}
        today={today}
        state={state}
        labelOf={labelOf}
      />
    </div>
  );
}
