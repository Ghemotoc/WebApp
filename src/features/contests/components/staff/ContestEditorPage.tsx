/**
 * ContestEditorPage: Staff › Contests › one contest (story S1-E11-15 criteria 1 and 2; bundle
 * CONTESTS-13b1).
 *
 * What it shows: the way back to the list, the contest's name and landing page, whether it is a
 * draft or open, the opening panel and the form with every detail. Plain staff components, no
 * doodles. Once the contest is open, the entries list with Disqualify follows (part 13b2a);
 * results and certificates join in part 13b2b.
 * Who shows it: the router, at /staff/contests/:contestId (owner and admin; the server refuses
 * everyone else). What it calls: useContestEditor(); ContestEntriesSection reads the entries.
 */
import { Link, useParams } from 'react-router';

import { ChevronLeftIcon } from '@/components/icons/ChevronLeftIcon';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useContestEditor } from '../../hooks/useStaffContests';
import { contestNameIn } from '../../lib/contestWords';
import { useContestTranslation } from '../../registerContestTranslations';

import { ContestEntriesSection } from './ContestEntriesSection';
import { ContestForm } from './ContestForm';
import { ContestOpenPanel } from './ContestOpenPanel';

/** The page under its heading: a wait, a plain message, or the panel and form. */
function EditorBody({ editor }: { editor: ReturnType<typeof useContestEditor> }) {
  const { t } = useContestTranslation();
  if (editor.loadFailed) return <Notice tone="error">{t('staff.loadFailed')}</Notice>;
  if (editor.contest === undefined) return null;
  if (editor.contest === null) return <Notice tone="error">{t('staff.editor.notFound')}</Notice>;
  return (
    <>
      <ContestOpenPanel contest={editor.contest} editor={editor} />
      {editor.contest.openedAt !== null && <ContestEntriesSection contest={editor.contest} />}
      <ContestForm key={editor.contest.id} contest={editor.contest} editor={editor} />
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the contest editor
 */
export function ContestEditorPage() {
  const { t, i18n } = useContestTranslation();
  const { contestId = '' } = useParams();
  const editor = useContestEditor(contestId);
  const contest = editor.contest ?? null;
  const name = contest === null ? '' : contestNameIn(contest, i18n.language);
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('staff.editor.documentTitle')}</title>
      <Link
        to="/staff/contests"
        className="inline-flex min-h-11 w-fit items-center gap-1 text-sm font-semibold text-link"
      >
        <ChevronLeftIcon aria-hidden="true" />
        {t('staff.editor.back')}
      </Link>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {name === '' ? t('staff.unnamed') : name}
        </h1>
        {contest !== null && (
          <p className="m-0 text-body">
            {t('staff.editor.pageLink', { slug: contest.pageSlug })}{' '}
            {contest.openedAt === null ? t('staff.editor.draft') : ''}
          </p>
        )}
      </div>
      <div className="flex max-w-[960px] flex-col gap-6">
        <EditorBody editor={editor} />
      </div>
    </PageContainer>
  );
}
