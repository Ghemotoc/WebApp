/**
 * NoticeForm: one notice banner being written (story S1-E11-10 criteria 1, 2 and 9).
 *
 * The text in every language of the market side by side (each up to 120 characters), an optional
 * link to one of our own pages, the type, where it shows, and the "show from" and "show until"
 * dates. Notices are text only: no sponsor names, no logos, no outside links (paid content goes
 * through Sponsors, S1-E12). Who shows it: NoticeEditor. What it calls: the editor state's act().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';
import type { Json } from '@/lib/database.types';
import {
  noticePlaces,
  noticeTextLimit,
  noticeTypes,
  type NoticeContent,
} from '@/schemas/websiteContent';

import type { WebsiteEditorState } from '../../hooks/useWebsiteEditor';
import { problemAt } from '../../lib/fieldProblems';
import { labelPartsOf } from '../../lib/contentPaths';

import { CountedField } from './CountedField';
import { PublishControls } from './PublishControls';

/** What the form needs. */
export interface NoticeFormProps {
  marketCode: string;
  marketLanguages: string[];
  entryKey: string;
  initial: NoticeContent;
  initialShowFrom: string;
  initialShowUntil: string;
  today: string;
  state: WebsiteEditorState;
}

/**
 * The type and place drop-downs.
 *
 * @returns the two selects
 */
function NoticeChoices({
  notice,
  onChange,
}: {
  notice: NoticeContent;
  onChange: (next: NoticeContent) => void;
}) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <div className="flex flex-wrap gap-4">
      <Select
        id="notice-type"
        label={t('notices.type')}
        options={noticeTypes.map((type) => ({ value: type, label: t(`notices.types.${type}`) }))}
        value={notice.noticeType}
        onChange={(value) =>
          onChange({ ...notice, noticeType: value as NoticeContent['noticeType'] })
        }
      />
      <Select
        id="notice-place"
        label={t('notices.showOn')}
        options={noticePlaces.map((place) => ({
          value: place,
          label: t(`notices.places.${place}`),
        }))}
        value={notice.showOn}
        onChange={(value) => onChange({ ...notice, showOn: value as NoticeContent['showOn'] })}
      />
    </div>
  );
}

/** What the text fields need. */
interface NoticeTextsProps {
  notice: NoticeContent;
  marketLanguages: string[];
  problemOf: (path: string) => string | null;
  onChange: (next: NoticeContent) => void;
}

/**
 * The text in every language of the market, side by side, then the optional link.
 *
 * @returns the fields
 */
function NoticeTexts({ notice, marketLanguages, problemOf, onChange }: NoticeTextsProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {marketLanguages.map((language) => (
          <CountedField
            key={language}
            id={`notice-text-${language}`}
            label={t('notices.textIn', {
              language: t(`languages.${language}`, { defaultValue: language }),
            })}
            value={notice.texts[language] ?? ''}
            limit={noticeTextLimit}
            isMultiline
            rows={2}
            lang={language}
            serverProblem={problemOf(`texts.${language}`)}
            onChange={(value) =>
              onChange({ ...notice, texts: { ...notice.texts, [language]: value } })
            }
          />
        ))}
      </div>
      <div className="max-w-[420px]">
        <TextInput
          id="notice-link"
          label={t('notices.link')}
          hint={t('notices.linkHint')}
          value={notice.link ?? ''}
          // An empty box means no link.
          onChange={(event) =>
            onChange({ ...notice, link: event.target.value === '' ? null : event.target.value })
          }
        />
      </div>
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the fields and the publish block
 */
export function NoticeForm({
  marketCode,
  marketLanguages,
  entryKey,
  initial,
  initialShowFrom,
  initialShowUntil,
  today,
  state,
}: NoticeFormProps) {
  const { t } = useTranslation('websiteAdmin');
  const [notice, setNotice] = useState(initial);
  const [showFrom, setShowFrom] = useState(initialShowFrom);
  const [showUntil, setShowUntil] = useState(initialShowUntil);
  const problemOf = (path: string) => problemAt(state.failure, path);
  const labelOf = (path: string) =>
    t(`notices.fields.${labelPartsOf(path).labelKey}`, { defaultValue: path });
  const draft = {
    kind: 'notice' as const,
    entryKey,
    marketCode,
    languageCode: null,
    content: notice as unknown as Json,
    showFrom,
    showUntil: showUntil === '' ? null : showUntil,
  };
  return (
    <div className="flex flex-col gap-4">
      <NoticeTexts
        notice={notice}
        marketLanguages={marketLanguages}
        problemOf={problemOf}
        onChange={setNotice}
      />
      <NoticeChoices notice={notice} onChange={setNotice} />
      <div className="w-[200px]">
        <TextInput
          id="notice-show-until"
          type="date"
          label={t('notices.showUntil')}
          hint={t('notices.showUntilHint')}
          min={showFrom}
          value={showUntil}
          onChange={(event) => setShowUntil(event.target.value)}
        />
      </div>
      <PublishControls
        idPrefix="notice"
        draft={draft}
        onShowFromChange={setShowFrom}
        today={today}
        state={state}
        labelOf={labelOf}
      />
    </div>
  );
}
