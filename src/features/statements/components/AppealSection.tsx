/**
 * AppealSection: appeal a decision from its statement of reasons (story S1-E10-07; DSA art. 20:
 * free, electronic, for six months, decided by people other than the one who decided, where
 * possible; board 6.5's Appeal button and form).
 *
 * What it shows, in order:
 * - an appeal already sent: its reference and state, and once decided the outcome and the
 *   moderator's words (art. 20(5));
 * - while the six months last and no appeal is open: "Appeal this decision", which opens a short
 *   form (why the decision is wrong) in place;
 * - after six months: when the time ended.
 * It always links to moderator mail for a question that isn't an appeal (S1-E10-11).
 * Who shows it: StatementCard (not on the staff case page). What it calls: useAppeal.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import { appealExplanationLimit, type StatementOfReasons } from '../api/statements';
import { useAppeal } from '../hooks/useAppeal';
import { readableDate } from '../lib/statementText';
import { useStatementsTranslation } from '../registerStatementsTranslations';

/**
 * The latest appeal's state.
 *
 * @returns the notice
 */
function AppealState({ statement }: { statement: StatementOfReasons }) {
  const { t, i18n } = useStatementsTranslation();
  const appeal = statement.appeal;
  if (appeal === null) return null;
  if (appeal.status === 'open') {
    return (
      <Notice tone="info">
        {t('appeals.open', {
          reference: appeal.reference,
          date: readableDate(appeal.createdAt, i18n.language),
        })}
      </Notice>
    );
  }
  return (
    <Notice tone={appeal.status === 'overturned' ? 'success' : 'info'}>
      <span className="block font-semibold">
        {t(`appeals.outcomes.${appeal.status}`, { reference: appeal.reference })}
      </span>
      {appeal.message !== null && <span className="mt-1 block">{appeal.message}</span>}
    </Notice>
  );
}

/**
 * The appeal form, opened in place.
 *
 * @returns the form
 */
function AppealForm({
  statement,
  onCancel,
}: {
  statement: StatementOfReasons;
  onCancel: () => void;
}) {
  const { t } = useStatementsTranslation();
  const [explanation, setExplanation] = useState('');
  const appeal = useAppeal(statement.reference);
  const fieldId = `appeal-${statement.reference}`;

  /** Sends the appeal, unless the explanation is empty (the field says so). */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (explanation.trim() !== '') appeal.send(explanation.trim());
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[14px] bg-panel p-4"
    >
      <Textarea
        id={fieldId}
        label={t('appeals.label')}
        hint={t('appeals.hint')}
        rows={5}
        maxLength={appealExplanationLimit}
        value={explanation}
        onChange={(event) => setExplanation(event.target.value)}
      />
      <div aria-live="polite">
        {appeal.failure !== null && (
          <Notice tone="error">
            {t(`appeals.failures.${appeal.failure}`, { minutes: appeal.waitMinutes ?? 60 })}
          </Notice>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={appeal.isSending || explanation.trim() === ''}>
          {appeal.isSending ? t('appeals.sending') : t('appeals.send')}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('appeals.cancel')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Renders the section.
 *
 * @param props.statement - the statement
 * @returns the section
 */
export function AppealSection({ statement }: { statement: StatementOfReasons }) {
  const { t, i18n } = useStatementsTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const until = readableDate(statement.appealUntil, i18n.language);
  const mailAddress = `/moderator-mail/new?decision=${encodeURIComponent(statement.reference)}`;
  return (
    <div className="flex flex-col gap-3">
      <AppealState statement={statement} />
      {statement.canAppeal && !isFormOpen && (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-body">{t('appeals.until', { date: until })}</p>
          <p className="m-0 text-sm text-body">{t('appeals.how')}</p>
          <div>
            <Button variant="secondary" onClick={() => setIsFormOpen(true)}>
              {t('appeals.open_form')}
            </Button>
          </div>
        </div>
      )}
      {statement.canAppeal && isFormOpen && (
        <AppealForm statement={statement} onCancel={() => setIsFormOpen(false)} />
      )}
      {!statement.canChallenge && (
        <p className="m-0 text-sm text-meta">{t('appeals.ended', { date: until })}</p>
      )}
      <Link to={mailAddress} className="w-fit text-sm font-semibold text-link underline">
        {t('appeals.askModerators')}
      </Link>
    </div>
  );
}
