/**
 * PicturesToCheckPage: /staff/pictures, Moderation › Pictures to check (bundle ADMIN-2, part e1b;
 * Robert's brief of 2 Nov 2026, sections 2 and 3).
 *
 * Every picture in an All ages or 13+ story, and every picture from someone under 16, waits here
 * once the automatic check passes it; nobody but the uploader and staff sees it until a moderator
 * decides. Oldest first. The same pictures also sit in the moderation queue as picture cases, so a
 * decision on either page closes both. Safeguarding cases never show here (S1-E10-10).
 * Plain components, no doodles (staff screens).
 * Who shows it: the router, inside StaffLayout; the menu shows it to roles with the moderation
 * area. The database refuses everyone else, and the page says so.
 * What it calls: usePicturesToCheck → api/picturesToCheck.ts.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { usePicturesToCheck } from '../hooks/usePicturesToCheck';
import { registerModerationTranslations } from '../registerModerationTranslations';

import { PictureToCheckCard } from './PictureToCheckCard';

/**
 * The list, or why there is none.
 *
 * @returns the list part of the page
 */
function PicturesList({ state }: { state: ReturnType<typeof usePicturesToCheck> }) {
  const { t } = useTranslation('moderation');
  if (state.loadFailure === 'not_allowed')
    return <p className="m-0 text-body">{t('pictures.notAllowed')}</p>;
  if (state.loadFailure !== null)
    return <Notice tone="error">{t(`failures.${state.loadFailure}`)}</Notice>;
  if (state.isLoading) return <p className="m-0 text-meta">{t('pictures.loading')}</p>;
  if (state.pictures.length === 0) return <p className="m-0 text-body">{t('pictures.none')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-6 p-0" aria-label={t('pictures.listLabel')}>
      {state.pictures.map((picture) => (
        <PictureToCheckCard
          key={picture.caseId}
          picture={picture}
          reasons={state.reasons}
          isDeciding={state.isDeciding && state.decidingCaseId === picture.caseId}
          onDecide={state.decide}
        />
      ))}
    </ul>
  );
}

/**
 * Renders the page.
 *
 * @returns the Pictures to check screen
 */
export function PicturesToCheckPage() {
  const { i18n } = useTranslation();
  registerModerationTranslations(i18n);
  const { t } = useTranslation('moderation');
  const state = usePicturesToCheck();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('pictures.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('queue.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('pictures.heading')}
        </h1>
        <p className="m-0 text-body">{t('pictures.intro')}</p>
        <p className="m-0 text-body">{t('pictures.guidance')}</p>
        <p className="m-0 text-meta">{t('pictures.openedNote')}</p>
      </div>
      <div aria-live="polite">
        {state.decisionFailure !== null && (
          <Notice tone="error">{t(`failures.${state.decisionFailure}`)}</Notice>
        )}
      </div>
      <div className="max-w-[880px]">
        <PicturesList state={state} />
      </div>
    </PageContainer>
  );
}
