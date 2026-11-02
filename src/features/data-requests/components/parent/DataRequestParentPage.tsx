/**
 * DataRequestParentPage: the page a parent or guardian opens from our email about their child's
 * data request (bundle ADMIN-2, part c3; story S1-E11-09 criterion 5 and "for a parent, a
 * one-time link to the checked email address").
 *
 * Who shows it: the router, at /data-request/parent. The link is /data-request/parent#<token>:
 * the token sits after "#", so it never reaches a server log or a Referer header.
 * What it shows, from useParentLink(token):
 * - a check link: "Did you ask for @handle's data?" and the answer (ParentCheckPanel);
 * - a copy link: the one-time link to the files (ParentCopyPanel);
 * - a link that no longer works: "This link no longer works".
 * Works signed out. Once the link loads, the page switches to the language the parent agreed in
 * (without saving it anywhere); the language menu still changes it. Plain page: no doodles.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { ParentLink } from '../../api/dataRequestParent';
import { useParentLink } from '../../hooks/useParentLink';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { ParentCheckPanel } from './ParentCheckPanel';
import { ParentCopyPanel } from './ParentCopyPanel';

/** useParentLink's result, passed down once. */
type LinkState = ReturnType<typeof useParentLink>;

/**
 * Switches the page to the parent's language once, when the link first loads.
 *
 * @param link - the loaded link, or null and undefined before that
 */
function useLinkLanguage(link: ParentLink | undefined) {
  const { i18n } = useDataRequestsTranslation();
  const hasSwitched = useRef(false);
  useEffect(() => {
    if (hasSwitched.current || link === null || link === undefined) return;
    hasSwitched.current = true;
    if (i18n.language !== link.language) void i18n.changeLanguage(link.language);
  }, [link, i18n]);
}

/**
 * The page's card, with its heading and the contact line under it.
 *
 * @returns the card
 */
function ParentCard({ heading, children }: { heading: string; children: ReactNode }) {
  const { t } = useDataRequestsTranslation();
  return (
    <section
      aria-labelledby="data-request-parent-heading"
      className="flex w-full max-w-[720px] flex-col gap-5 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('parent.eyebrow')}</Eyebrow>
        <h1
          id="data-request-parent-heading"
          className="m-0 font-heading text-[30px] font-bold break-words text-heading"
        >
          {heading}
        </h1>
      </div>
      {children}
      <p className="m-0 text-sm text-meta">
        {t('parent.questions')}{' '}
        <Link to="/contact" className="text-link underline hover:text-link-hover">
          {t('parent.contactUs')}
        </Link>
      </p>
    </section>
  );
}

/**
 * Picks the card for the link.
 *
 * @returns the card, a wait or an error
 */
function ParentBody({ state }: { state: LinkState }) {
  const { t } = useDataRequestsTranslation();
  const link = state.link;
  if (state.loadFailed) return <Notice tone="error">{t('parent.loadFailed')}</Notice>;
  if (link === undefined) return <p className="m-0 text-body">{t('parent.loading')}</p>;
  if (link === null) {
    return (
      <ParentCard heading={t('parent.goneHeading')}>
        <p className="m-0 text-body">{t('parent.goneBody')}</p>
      </ParentCard>
    );
  }
  if (link.link === 'check') {
    return (
      <ParentCard heading={t('parent.checkHeading', { handle: link.handle })}>
        <ParentCheckPanel
          link={link}
          isAnswering={state.isAnswering}
          answerFailed={state.answerFailed}
          onAnswer={state.answer}
        />
      </ParentCard>
    );
  }
  return (
    <ParentCard heading={t('parent.copyHeading', { handle: link.handle })}>
      <ParentCopyPanel
        link={link}
        isOpening={state.isOpening}
        opened={state.opened}
        openFailed={state.openFailed}
        onOpen={state.open}
      />
    </ParentCard>
  );
}

/**
 * Renders the page.
 *
 * @returns the parent's data request screen
 */
export function DataRequestParentPage() {
  const { t } = useDataRequestsTranslation();
  const token = useLocation().hash.replace(/^#/, '');
  const state = useParentLink(token);
  useLinkLanguage(state.link);
  return (
    <PageContainer className="tmc-rise flex justify-center pt-12 pb-7">
      <title>{t('parent.documentTitle')}</title>
      <ParentBody state={state} />
    </PageContainer>
  );
}
