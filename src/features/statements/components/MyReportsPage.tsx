/**
 * MyReportsPage: /my-reports, "My reports and decisions" (story S1-E10-04; board 6.5, MyReports;
 * DSA art. 17: the statement of reasons; art. 16(5): the reporter is told the decision).
 *
 * Board: the Safety eyebrow, the title and intro, "Decisions about your posts" (each statement in
 * full) and "Reports you sent" (each with its outcome), and "Need to talk to us?" with a link to
 * the moderators. A decision's notification links here, to the statement's own anchor
 * (#S-000123). Appeals in the app are S1-E10-07 (after March): each statement links to Contact us.
 * Who shows it: the router, at /my-reports (loaded when opened). What it calls:
 * useMyReportsAndDecisions → my_statements(), my_reports().
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
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
      <h2 id="my-decisions-heading" className="m-0 font-heading text-[26px] font-bold text-heading">
        {t('decisions.heading')} <span className="text-meta">({statements.length})</span>
      </h2>
      {statements.length === 0 ? (
        <p className="m-0 text-body">{t('decisions.empty')}</p>
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
      <h2 id="my-reports-heading" className="m-0 font-heading text-[26px] font-bold text-heading">
        {t('reports.heading')} <span className="text-meta">({reports.length})</span>
      </h2>
      {reports.length === 0 ? (
        <p className="m-0 text-body">{t('reports.empty')}</p>
      ) : (
        <ul className="m-0 list-none rounded-card border border-border bg-surface px-6 py-1 shadow-card">
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
    <aside
      aria-labelledby="my-reports-contact-heading"
      className="flex flex-col gap-2 rounded-card border border-panel-border bg-panel p-6"
    >
      <h2 id="my-reports-contact-heading" className="m-0 text-xl font-bold text-ink">
        {t('page.contactHeading')}
      </h2>
      <p className="m-0 text-body">{t('page.contactBody')}</p>
      <Link to="/moderator-mail" className="w-fit font-semibold text-link underline">
        {t('page.contactLink')}
      </Link>
    </aside>
  );
}

/**
 * The lists for a signed-in person.
 *
 * @returns the two sections and the contact card, a wait, or a plain error
 */
function SignedInBody() {
  const { t } = useStatementsTranslation();
  const lists = useMyReportsAndDecisions(true);
  if (lists.loadFailed) return <Notice tone="error">{t('page.loadFailed')}</Notice>;
  if (lists.isLoading) return null;
  return (
    <div className="flex flex-wrap items-start gap-8 pb-16">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-10">
        <DecisionsSection statements={lists.statements} />
        <ReportsSection reports={lists.reports} />
      </div>
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
    <PageContainer className="flex flex-col gap-8">
      <title>{t('page.documentTitle')}</title>
      <header className="flex max-w-[720px] flex-col gap-4 pt-14">
        <Eyebrow>{t('page.eyebrow')}</Eyebrow>
        <h1 className="m-0 text-[clamp(36px,4.4vw,64px)] leading-[0.98] font-extrabold tracking-[-0.025em]">
          {t('page.title')}
        </h1>
        <p className="m-0 text-lg leading-relaxed text-body">{t('page.intro')}</p>
      </header>
      {isKnown && userId === null && (
        <p className="m-0 pb-16 text-body">
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
