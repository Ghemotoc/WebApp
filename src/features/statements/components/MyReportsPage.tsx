/**
 * MyReportsPage: /my-reports, "Reports and decisions" (story S1-E10-04; board 6.5, MyReports;
 * DSA art. 17: the statement of reasons; art. 16(5): the reporter is told the decision).
 *
 * Board: the title and intro, "Decisions about your posts" (each statement in full) and "Reports
 * you sent" (each with its outcome), and "Need to talk to us?" with a link to the moderators. A
 * decision's notification links here, to the statement's own anchor (#S-000123). Appeals in the
 * app are S1-E10-07 (after March): each statement links to Contact us. A "Show" control (bundle
 * G11c) picks one list at a time, each with its count; it starts on the decisions when there are
 * any (or when the address names one), otherwise on the reports.
 * Since user stories bundle 10 (board J04) the page opens with a breadcrumb, "Settings / Reports
 * and decisions", instead of an eyebrow and a back link; the "Show" label is visible; the reports
 * sit straight on the page with fine lines between them; and "Need to talk to us?" is unboxed.
 * Who shows it: the router, at /my-reports (loaded when opened). What it calls:
 * useMyReportsAndDecisions → my_statements(), my_reports().
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router';

import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSession } from '@/features/auth/hooks/useSession';

import type { MyReport, StatementOfReasons } from '../api/statements';
import { useMyReportsAndDecisions } from '../hooks/useMyReportsAndDecisions';
import { useStatementsTranslation } from '../registerStatementsTranslations';

import { MyReportRow } from './MyReportRow';
import { StatementCard } from './StatementCard';

/**
 * "Decisions about your posts": every statement, newest first.
 *
 * @returns the section
 */
function DecisionsSection({ statements }: { statements: StatementOfReasons[] }) {
  const { t } = useStatementsTranslation();
  return (
    <section aria-labelledby="my-decisions-heading" className="flex flex-col gap-4">
      <h2
        id="my-decisions-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('decisions.heading')} <span className="text-ink-muted">({statements.length})</span>
      </h2>
      {statements.length === 0 ? (
        <p className="m-0 text-ink-muted">{t('decisions.empty')}</p>
      ) : (
        statements.map((statement) => (
          <StatementCard key={statement.reference} statement={statement} />
        ))
      )}
    </section>
  );
}

/**
 * "Reports you sent": every report, newest first.
 *
 * @returns the section
 */
function ReportsSection({ reports }: { reports: MyReport[] }) {
  const { t } = useStatementsTranslation();
  return (
    <section aria-labelledby="my-reports-heading" className="flex flex-col gap-2">
      <h2
        id="my-reports-heading"
        className="m-0 font-heading type-heading font-bold text-ink-heading"
      >
        {t('reports.heading')} <span className="text-ink-muted">({reports.length})</span>
      </h2>
      {reports.length === 0 ? (
        <p className="m-0 text-ink-muted">{t('reports.empty')}</p>
      ) : (
        <ul className="m-0 list-none border-t border-hairline p-0">
          {reports.map((report) => (
            <MyReportRow key={report.reference} report={report} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * "Need to talk to us?": the way to the moderation team.
 *
 * @returns the aside
 */
function ContactCard() {
  const { t } = useStatementsTranslation();
  return (
    <aside aria-labelledby="my-reports-contact-heading" className="flex flex-col gap-2">
      <h2 id="my-reports-contact-heading" className="m-0 type-subheading font-bold text-ink">
        {t('page.contactHeading')}
      </h2>
      <p className="m-0 text-ink-muted">{t('page.contactBody')}</p>
      <Link to="/moderator-mail" className="w-fit font-semibold text-ink-heading underline">
        {t('page.contactLink')}
      </Link>
    </aside>
  );
}

/** The two lists the "Show" control picks between. */
type ShownList = 'decisions' | 'reports';

/**
 * The list to start on: the decisions when there are any, or when the address names one
 * (a decision's notification links to #S-000123); otherwise the reports.
 *
 * @returns the list to show first
 */
function useFirstList(statementCount: number): ShownList {
  const { hash } = useLocation();
  if (statementCount > 0 || hash.startsWith('#S-')) return 'decisions';
  return 'reports';
}

/**
 * The two lists behind the "Show" control, one at a time.
 *
 * @returns the control and the list it picks
 */
function ShownLists({ lists }: { lists: ReturnType<typeof useMyReportsAndDecisions> }) {
  const { t } = useStatementsTranslation();
  const firstList = useFirstList(lists.statements.length);
  const [shown, setShown] = useState<ShownList>(firstList);
  return (
    <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-8">
      <SegmentedControl
        legend={t('page.showLegend')}
        name="my-reports-show"
        value={shown}
        onChange={setShown}
        options={[
          {
            value: 'decisions',
            label: t('page.showDecisions', { count: lists.statements.length }),
          },
          { value: 'reports', label: t('page.showReports', { count: lists.reports.length }) },
        ]}
      />
      {shown === 'decisions' ? (
        <DecisionsSection statements={lists.statements} />
      ) : (
        <ReportsSection reports={lists.reports} />
      )}
    </div>
  );
}

/**
 * The lists for a signed-in person.
 *
 * @returns the lists and the contact card, a wait, or a plain error
 */
function SignedInBody() {
  const { t } = useStatementsTranslation();
  const lists = useMyReportsAndDecisions(true);
  if (lists.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (lists.isLoading) return null;
  return (
    <div className="flex flex-wrap items-start gap-8 pb-16">
      <ShownLists lists={lists} />
      <div className="flex min-w-0 flex-[1_1_300px] flex-col">
        <ContactCard />
      </div>
    </div>
  );
}

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function MyReportsPage() {
  const { t } = useStatementsTranslation();
  const { userId, isKnown } = useSession();
  return (
    <PageContainer className="flex flex-col gap-8 pt-8">
      <title>{t('page.documentTitle')}</title>
      <Breadcrumb
        label={t('page.breadcrumb')}
        steps={[
          { label: t('page.breadcrumbSettings'), to: '/settings' },
          { label: t('page.title') },
        ]}
      />
      <header className="flex max-w-[720px] flex-col gap-4">
        <h1 className="m-0 type-title lg:type-display">{t('page.title')}</h1>
        <p className="m-0 type-long leading-relaxed text-ink-muted">{t('page.intro')}</p>
      </header>
      {isKnown && userId === null && (
        <p className="m-0 pb-16 text-ink-muted">
          {t('page.signedOut')}{' '}
          <Link to="/sign-in" className="text-link underline">
            {t('page.logIn')}
          </Link>
        </p>
      )}
      {isKnown && userId !== null && <SignedInBody />}
    </PageContainer>
  );
}
