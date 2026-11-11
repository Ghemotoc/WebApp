/**
 * LandingPageEditor: one landing page in Staff › Website › Landing pages: its address, the form,
 * its published versions and "Archive" (story S1-E11-14; bundle CONTESTS-13a1).
 *
 * The form starts from the draft when there is one, otherwise from the newest published version,
 * otherwise from an empty page. Archiving takes the address down for good and asks once more
 * before it does.
 * Who shows it: LandingPagesTab, when a page is open. What it calls: useLandingPageEditor,
 * LandingEditorForm and LandingVersionHistory.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { romaniaDateOf } from '@/features/website/lib/versionState';

import {
  emptyLandingContent,
  type LandingDraftInput,
  type StaffLandingPage,
} from '../../api/landingPages';
import { useLandingPageEditor, type LandingEditorState } from '../../hooks/useLandingPageEditor';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

import { CopyPageForm } from './CopyPageForm';
import { LandingEditorForm } from './LandingEditorForm';
import { LandingVersionHistory } from './LandingVersionHistory';

/** What the editor needs. */
interface LandingPageEditorProps {
  page: StaffLandingPage;
  /** Goes back to the list (after archiving, too). */
  onClose: () => void;
}

/**
 * The version the form starts from.
 *
 * @returns its id (for the form's key) and its fields
 */
function startingPoint(
  pageId: string,
  state: LandingEditorState,
): { key: string; draft: LandingDraftInput } {
  const draft = state.versions.find((version) => version.status === 'draft');
  const start = draft ?? state.versions.find((version) => version.status === 'published');
  if (start === undefined) {
    return {
      key: 'empty',
      draft: { pageId, content: emptyLandingContent, showFrom: null, takeDownOn: null },
    };
  }
  return {
    key: start.id,
    draft: {
      pageId,
      content: start.content,
      showFrom: start.showFrom,
      takeDownOn: start.takeDownOn,
    },
  };
}

/**
 * "Archive", which asks once more before taking the address down for good.
 *
 * @returns the button, or the question and its two answers
 */
function ArchiveControl({
  page,
  state,
  onClose,
}: LandingPageEditorProps & { state: LandingEditorState }) {
  const { t } = useLandingPageTranslation();
  const [isAsking, setIsAsking] = useState(false);
  if (page.isArchived) return <p className="m-0 text-sm text-meta">{t('editor.archived')}</p>;
  if (!isAsking) {
    return (
      <div>
        <Button variant="destructive" onClick={() => setIsAsking(true)}>
          {t('editor.archive')}
        </Button>
      </div>
    );
  }
  return (
    <div
      role="group"
      aria-labelledby="landing-archive-question"
      className="flex flex-wrap items-center gap-3"
    >
      <p id="landing-archive-question" className="m-0 text-body">
        {t('editor.archiveQuestion', { slug: page.slug })}
      </p>
      <Button
        variant="destructive"
        disabled={state.isActing}
        onClick={() =>
          void state.act({ kind: 'archive', pageId: page.id }).then((worked) => worked && onClose())
        }
      >
        {t('editor.archiveConfirm')}
      </Button>
      <Button variant="secondary" onClick={() => setIsAsking(false)}>
        {t('editor.archiveCancel')}
      </Button>
    </div>
  );
}

/**
 * Renders the editor.
 *
 * @returns the page's section
 */
export function LandingPageEditor({ page, onClose }: LandingPageEditorProps) {
  const { t } = useLandingPageTranslation();
  const state = useLandingPageEditor(page.id);
  const today = romaniaDateOf(new Date());
  const start = startingPoint(page.id, state);
  return (
    <section aria-labelledby="landing-editor-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button variant="text" className="self-start" onClick={onClose}>
          {t('editor.back')}
        </Button>
        <h2
          id="landing-editor-heading"
          className="m-0 font-heading text-[24px] font-bold break-words text-heading"
        >
          {t('editor.heading', { slug: page.slug, type: t(`types.${page.pageType}`) })}
        </h2>
        <Link
          to={`/c/${page.slug}`}
          className="inline-flex min-h-6 items-center self-start text-sm text-link underline"
        >
          {t('editor.openPage', { slug: page.slug })}
        </Link>
      </div>
      {state.loadFailure !== null && <Notice tone="error">{t('loadFailed')}</Notice>}
      {state.isLoading && <p className="m-0 text-meta">{t('loading')}</p>}
      {!state.isLoading && state.loadFailure === null && (
        <LandingEditorForm
          key={`${start.key}-${state.restoreCount}`}
          initial={start.draft}
          pageType={page.pageType}
          today={today}
          state={state}
        />
      )}
      <LandingVersionHistory versions={state.versions} state={state} />
      {/* S1-E11-35: a new draft at its own address, from this page's saved words. */}
      <CopyPageForm page={page} />
      <ArchiveControl page={page} state={state} onClose={onClose} />
    </section>
  );
}
