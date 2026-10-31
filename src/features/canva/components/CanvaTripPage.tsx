/**
 * CanvaTripPage: the frame of the two pages a Canva trip passes through (story S1-E3-12):
 * the heading "Design it in Canva", what is happening, and the way back to the story.
 *
 * The tab that "Design it in Canva" opened shows these pages while it goes to Canva and back.
 * They are plain: a heading, one message and a link, nothing to read past.
 * Who uses it: CanvaStartPage and CanvaReturnPage.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { PageContainer } from '@/components/ui/PageContainer';

/** What the frame shows. */
export interface CanvaTripPageProps {
  /** The message, or the notice. */
  children: ReactNode;
  /** The story's slug for the way back to its settings; null goes back to Your writing. */
  backSlug: string | null;
}

/**
 * Renders the frame.
 *
 * @returns the page
 */
export function CanvaTripPage({ children, backSlug }: CanvaTripPageProps) {
  const { t } = useTranslation('writing');
  const backAddress = backSlug === null ? '/write' : `/write/s/${backSlug}/settings`;
  return (
    <PageContainer className="flex flex-col gap-4 pt-12 pb-7">
      <title>{t('canva.documentTitle')}</title>
      <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('canva.heading')}</h1>
      <div aria-live="polite" className="flex max-w-[640px] flex-col gap-3">
        {children}
      </div>
      <p className="m-0">
        <Link to={backAddress} className="text-link underline hover:text-link-hover">
          {backSlug === null ? t('canva.backToWriting') : t('canva.backToSettings')}
        </Link>
      </p>
    </PageContainer>
  );
}
