/**
 * StatementCard: one statement of reasons as the person reads it (story S1-E10-04; DSA art.
 * 17(3); board 6.5, MyReports: "Decisions about your posts").
 *
 * Board: the title, "Decided … · Case …", then label rows: What we did, Why, The rule, How we
 * found it, and "You can appeal until …". The board's Appeal button and form are S1-E10-07 (after
 * March); until then the card links to Contact us with the decision's reference filled in, and
 * says a different moderator looks at it where possible (docs/board-fixes.md).
 * Who shows it: MyReportsPage, and the staff case page (isStaffView: no challenge link).
 * What it calls: lib/statementText.ts for the words.
 */
import { Link } from 'react-router';

import { LabelRows } from '@/components/ui/LabelRows';

import type { StatementOfReasons } from '../api/statements';
import { howFoundText, readableDate, ruleText, whatWeDidText } from '../lib/statementText';
import { useStatementsTranslation } from '../registerStatementsTranslations';

/**
 * How to challenge the decision, while the six months last; then when they ended.
 *
 * @returns the paragraph and the link
 */
function ChallengeLine({ statement }: { statement: StatementOfReasons }) {
  const { t, i18n } = useStatementsTranslation();
  const until = readableDate(statement.appealUntil, i18n.language);
  if (!statement.canChallenge) {
    return (
      <p className="m-0 text-sm text-meta">{t('decisions.challengeEnded', { date: until })}</p>
    );
  }
  const message = t('decisions.challengeMessage', { reference: statement.reference });
  const address = `/contact?topic=other&message=${encodeURIComponent(message)}`;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-body">
        {t('decisions.challengeUntil')} <strong className="text-ink">{until}</strong>{' '}
        {t('decisions.challengeLength')}
      </p>
      <p className="m-0 text-sm text-body">{t('decisions.challengeHow')}</p>
      <Link
        to={address}
        aria-label={t('decisions.challengeLinkLabel', { reference: statement.reference })}
        className="w-fit text-sm font-semibold text-link underline"
      >
        {t('decisions.challengeLink')}
      </Link>
    </div>
  );
}

/**
 * Renders one statement.
 *
 * @param props.statement - the statement
 * @param props.isStaffView - true on the staff case page: the person's challenge link is left out
 * @returns the article
 */
export function StatementCard({
  statement,
  isStaffView = false,
}: {
  statement: StatementOfReasons;
  isStaffView?: boolean;
}) {
  const { t, i18n } = useStatementsTranslation();
  const rows = [
    { label: t('decisions.whatWeDid'), value: whatWeDidText(statement, t, i18n.language) },
    { label: t('decisions.why'), value: statement.facts ?? t('decisions.noFacts') },
    { label: t('decisions.rule'), value: ruleText(statement, t) },
    { label: t('decisions.howFound'), value: howFoundText(statement, t) },
  ];
  if (statement.itemSummary !== null) {
    rows.unshift({ label: t('decisions.about'), value: statement.itemSummary });
  }
  return (
    <article
      id={statement.reference}
      aria-labelledby={`statement-${statement.reference}`}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-1">
        <h3 id={`statement-${statement.reference}`} className="m-0 text-xl font-bold text-heading">
          {t(`decisions.titles.${statement.action}`)}
        </h3>
        <p className="m-0 text-sm text-meta">
          {t('decisions.meta', {
            date: readableDate(statement.issuedAt, i18n.language),
            reference: statement.reference,
          })}
        </p>
      </div>
      <LabelRows rows={rows} />
      {!isStaffView && <ChallengeLine statement={statement} />}
    </article>
  );
}
