/**
 * CanvaTripPage: the frame of the two pages a Canva trip passes through (story S1-E3-12), as
 * boards D10 and D11 draw it (BOOKS D10 and D11, user stories 5.10 and 5.11).
 *
 * What it shows: "Story settings / Cover" as a breadcrumb, then a header like every writing
 * page's: an optional state in bold ("Waiting for a check"), the heading that says what is
 * happening, one muted line under it and "Back to story settings". Beside it, from 1024 px, an
 * optional picture (D11's cover place); under it, an optional section (D10's "If something
 * stops it").
 * Who uses it: CanvaStartPage and CanvaReturnPage. What it calls: WritingBreadcrumb, MetaLine.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';
import { MetaLine } from '@/components/ui/MetaLine';
import { PageContainer } from '@/components/ui/PageContainer';
import {
  WritingBreadcrumb,
  type WritingCrumb,
} from '@/features/writing/components/WritingBreadcrumb';

/** What the frame shows. */
export interface CanvaTripPageProps {
  /** What is happening, as the page's heading ("Opening Canva…", "The cover is saved"). */
  heading: string;
  /** The line under the heading: what happens next, or why it stopped. */
  line?: ReactNode;
  /** A state shown in bold above the heading, such as "Waiting for a check". */
  state?: string;
  /** The story's slug for the way back to its settings; null goes back to Writing. */
  backSlug: string | null;
  /** True when going back is the page's one main action (D11); quiet otherwise (D10). */
  isBackMain?: boolean;
  /** Shown beside the header from 1024 px, such as the cover's place. */
  aside?: ReactNode;
  /** Shown under the header, such as "If something stops it". */
  children?: ReactNode;
}

/**
 * The breadcrumb: "Story settings / Cover" once the story is known, "Writing / Cover" before.
 *
 * @returns the crumbs
 */
function useTripCrumbs(backSlug: string | null): WritingCrumb[] {
  const { t } = useTranslation('writing');
  const first: WritingCrumb =
    backSlug === null
      ? { label: t('breadcrumb.writing'), to: '/write' }
      : { label: t('settings.heading'), to: `/write/s/${backSlug}/settings` };
  return [first, { label: t('canva.crumbCover') }];
}

/** The header: the state, the heading, the line and the way back (D10 and D11). */
function TripHeader(props: Omit<CanvaTripPageProps, 'aside' | 'children'>) {
  const { heading, line, state, backSlug, isBackMain = false } = props;
  const { t } = useTranslation('writing');
  const backAddress = backSlug === null ? '/write' : `/write/s/${backSlug}/settings`;
  const backVariant = isBackMain ? 'primary' : 'secondary';
  return (
    // aria-live: the heading and the line change as the trip goes on, and a screen reader hears it.
    <header aria-live="polite" className="flex flex-col gap-2">
      {state !== undefined && <MetaLine facts={[{ text: state, kind: 'state' }]} />}
      <h1 className="m-0 type-title lg:type-display">{heading}</h1>
      {line !== undefined && (
        <div className="m-0 max-w-[34em] type-body text-ink-muted">{line}</div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link to={backAddress} className={buttonClassName({ variant: backVariant, size: 'md' })}>
          {backSlug === null ? t('canva.backToWriting') : t('canva.backToSettings')}
        </Link>
      </div>
    </header>
  );
}

/**
 * Renders the frame.
 *
 * @returns the page
 */
export function CanvaTripPage(props: CanvaTripPageProps) {
  const { aside, children, ...header } = props;
  const { t } = useTranslation('writing');
  const crumbs = useTripCrumbs(props.backSlug);
  return (
    <PageContainer className="tmc-rise flex flex-col gap-8 pt-6 pb-12 md:gap-12 lg:gap-16 lg:pt-12 lg:pb-20">
      <title>{t('canva.documentTitle')}</title>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-3">
          <WritingBreadcrumb crumbs={crumbs} />
          <TripHeader {...header} />
        </div>
        {aside !== undefined && <div className="max-lg:hidden">{aside}</div>}
      </div>
      {children}
    </PageContainer>
  );
}
