/**
 * HomePageEditor: Website › Home page, the editor for one market's home page in one language
 * (story S1-E11-06 criteria 2 to 8; architecture 1.8.6).
 *
 * The admin edits the hero, "Why write here", the safety lines and the questions heading, with a
 * counter on every field and a live preview of the hero beside them. Save draft keeps the work;
 * Publish (or Schedule, for a later date) sends it live at 00:00 Romanian time on the "show from"
 * date. Earlier versions can be restored as a draft.
 * Who shows it: WebsiteAdminPage, after the market and language are picked.
 * What it calls: useWebsiteEditor('home_page'), then CountedField, HeroPreview, PublishControls
 * and VersionHistory.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Json } from '@/lib/database.types';
import { homePageContentSchema, type HomePageContent } from '@/schemas/websiteContent';

import type { ContentVersion } from '../../api/websiteContentStore';
import { useWebsiteEditor, type WebsiteEditorState } from '../../hooks/useWebsiteEditor';
import { labelPartsOf, textAt, withTextAt } from '../../lib/contentPaths';
import { problemAt } from '../../lib/fieldProblems';
import {
  bandFields,
  bandNames,
  emptyHomePage,
  heroFields,
  sectionFields,
  withEveryPart,
  type HomePageField,
} from '../../lib/homePageFields';
import { romaniaDateOf, sortEntryVersions } from '../../lib/versionState';

import { CountedField } from './CountedField';
import { HeroPreview } from './HeroPreview';
import { PublishControls } from './PublishControls';
import { SearchFieldsBox } from './SearchFieldsBox';
import { VersionHistory } from './VersionHistory';

/** What the editor needs. */
interface HomePageEditorProps {
  marketCode: string;
  language: string;
}

/**
 * Reads a version's content as a home page, or an empty one.
 *
 * @returns the content
 */
function homePageOf(version: ContentVersion | null): HomePageContent {
  const parsed = homePageContentSchema.safeParse(version?.content);
  if (!parsed.success) return emptyHomePage();
  // A version saved before the "Your rights" card (LOOK-2) or the bands (LOOK-3) existed gets
  // empty fields for them.
  return withEveryPart(parsed.data);
}

/**
 * Gives a field's label, numbered when it is one of several ("Short point 2").
 *
 * @returns the label function
 */
function useHomeFieldLabel() {
  const { t } = useTranslation('websiteAdmin');
  return (path: string) => {
    const { labelKey, number } = labelPartsOf(path);
    // A band's field ("writeBand.points.2.title") shares one label with the band's name in it.
    const [first, ...rest] = labelKey.split('.');
    const isBand = bandNames.some((name) => name === first);
    if (isBand) {
      const band = t(`home.fields.bandNames.${first ?? ''}`);
      return t(`home.fields.band.${rest.join('.')}`, { band, number: number ?? 1 });
    }
    return t(`home.fields.${labelKey}`, { number: number ?? 1 });
  };
}

/** What the form needs. */
interface HomePageFormProps extends HomePageEditorProps {
  initial: HomePageContent;
  initialShowFrom: string;
  today: string;
  state: WebsiteEditorState;
}

/**
 * A group of fields.
 *
 * @returns the fields
 */
function FieldGroup({
  fields,
  page,
  language,
  state,
  onChange,
}: {
  fields: HomePageField[];
  page: HomePageContent;
  language: string;
  state: WebsiteEditorState;
  onChange: (path: string, value: string) => void;
}) {
  const labelOf = useHomeFieldLabel();
  const problemOf = (path: string) => problemAt(state.failure, path);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.path} className={field.isMultiline ? 'md:col-span-2' : undefined}>
          <CountedField
            id={`home-${field.path.replaceAll('.', '-')}`}
            label={labelOf(field.path)}
            value={textAt(page, field.path)}
            limit={field.limit}
            isMultiline={field.isMultiline}
            rows={2}
            lang={language}
            serverProblem={problemOf(field.path)}
            onChange={(value) => onChange(field.path, value)}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * The home page with one text changed.
 *
 * @param page - the page as it is
 * @param path - the field's path ("lede", "whyCards.2.body")
 * @param value - the new text
 * @returns a new page; the old one is left as it was
 */
function withHomeText(page: HomePageContent, path: string, value: string): HomePageContent {
  return withTextAt(page as unknown as Json, path, value) as unknown as HomePageContent;
}

/**
 * One titled group of home page fields (the hero, or the sections under it).
 *
 * @returns the fieldset
 */
function HomeFieldset({
  legend,
  ...groupProps
}: { legend: string } & Parameters<typeof FieldGroup>[0]) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
      <legend className="mb-2 font-heading text-lg font-bold text-heading">{legend}</legend>
      <FieldGroup {...groupProps} />
    </fieldset>
  );
}

/**
 * The fields under the hero: the sections, then the bands and the footer note (LOOK-3).
 *
 * @returns the two fieldsets
 */
function LowerFieldsets(props: Omit<Parameters<typeof FieldGroup>[0], 'fields'>) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <>
      <HomeFieldset legend={t('home.sectionsLegend')} fields={sectionFields} {...props} />
      <HomeFieldset legend={t('home.bandsLegend')} fields={bandFields} {...props} />
    </>
  );
}

/**
 * The fields, the preview and the publish block for one version being edited.
 *
 * @returns the form
 */
function HomePageForm({
  marketCode,
  language,
  initial,
  initialShowFrom,
  today,
  state,
}: HomePageFormProps) {
  const { t } = useTranslation('websiteAdmin');
  const labelOf = useHomeFieldLabel();
  const [page, setPage] = useState(initial);
  const [showFrom, setShowFrom] = useState(initialShowFrom);
  const change = (path: string, value: string) =>
    setPage((current) => withHomeText(current, path, value));
  const draft = {
    kind: 'home_page' as const,
    entryKey: 'home',
    marketCode,
    languageCode: language,
    content: page as unknown as Json,
    showFrom,
    showUntil: null,
  };
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <HomeFieldset
          legend={t('home.heroLegend')}
          fields={heroFields}
          page={page}
          language={language}
          state={state}
          onChange={change}
        />
        <div className="xl:sticky xl:top-28 xl:self-start">
          <HeroPreview page={page} language={language} />
        </div>
      </div>
      <LowerFieldsets page={page} language={language} state={state} onChange={change} />
      {/* The search and share fields (S1-E11-37): empty ones use the headline and introduction. */}
      <SearchFieldsBox
        idPrefix="home"
        search={page.search}
        language={language}
        problemOf={(path) => problemAt(state.failure, path)}
        onChange={(search) => setPage((current) => ({ ...current, search }))}
      />
      <PublishControls
        idPrefix="home"
        draft={draft}
        onShowFromChange={setShowFrom}
        today={today}
        state={state}
        labelOf={labelOf}
      />
    </div>
  );
}

/**
 * Renders the editor for the market and language.
 *
 * @returns the editor and its history
 */
export function HomePageEditor({ marketCode, language }: HomePageEditorProps) {
  const { t } = useTranslation('websiteAdmin');
  const state = useWebsiteEditor('home_page', marketCode);
  const today = romaniaDateOf(new Date());
  const versions = state.versions.filter(
    (version) => version.entryKey === 'home' && version.languageCode === language,
  );
  const entry = sortEntryVersions(versions, today);
  const source = entry.draft ?? entry.scheduled ?? entry.live;
  if (state.isLoading) return <p className="m-0 text-meta">{t('loading')}</p>;
  return (
    <div className="flex flex-col gap-8">
      <HomePageForm
        key={`${marketCode}-${language}-${source?.id ?? 'new'}-${source?.updatedAt ?? ''}`}
        marketCode={marketCode}
        language={language}
        initial={homePageOf(source)}
        initialShowFrom={entry.draft?.showFrom ?? today}
        today={today}
        state={state}
      />
      <VersionHistory
        entry={entry}
        state={state}
        describe={(version) =>
          `${homePageOf(version).headlineFirst} ${homePageOf(version).headlineSecond}`
        }
      />
    </div>
  );
}
