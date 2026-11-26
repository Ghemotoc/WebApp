/**
 * MailThreadRows: a member's moderator mail threads as rows straight on the page (story
 * S1-E10-11; user stories bundle 10, board J22; it replaces the glass table of bundle G8c).
 *
 * Each row: the subject as the link, then one meta line with the state in bold, the reference,
 * the decision it is linked to (when there is one) and the last update. Rows have a fine line
 * between them (DoD label rows).
 * Who shows it: MyMailPage. What it calls: MetaLine, dayAndTime.
 */
import { Link } from 'react-router';

import { MetaLine, type MetaFact } from '@/components/ui/MetaLine';
import { dayAndTime } from '@/lib/dayAndTime';

import type { MailThreadSummary } from '../api/moderatorMail';
import { useMailTranslation } from '../registerMailTranslations';

/**
 * The facts in a thread's meta line.
 *
 * @returns the facts, the state first
 */
function useThreadFacts(thread: MailThreadSummary): MetaFact[] {
  const { t, i18n } = useMailTranslation();
  const facts: MetaFact[] = [
    { text: t(`statuses.${thread.status}`), kind: 'state' },
    { text: thread.reference },
  ];
  // Only a thread about a decision names it.
  if (thread.statementReference !== null) {
    facts.push({ text: t('list.linkedTo', { decision: thread.statementReference }) });
  }
  facts.push({ text: dayAndTime(thread.lastMessageAt, i18n.language) });
  return facts;
}

/**
 * One thread.
 *
 * @returns a list item
 */
function ThreadRow({ thread }: { thread: MailThreadSummary }) {
  const facts = useThreadFacts(thread);
  return (
    <li className="flex flex-col gap-1 border-b border-hairline py-4">
      <Link
        to={`/moderator-mail/${thread.reference}`}
        className="w-fit font-semibold break-words text-ink-heading no-underline hover:underline"
      >
        {thread.subject}
      </Link>
      <MetaLine facts={facts} />
    </li>
  );
}

/**
 * Renders the rows.
 *
 * @param props.threads - the person's threads, latest first
 * @returns the list
 */
export function MailThreadRows({ threads }: { threads: MailThreadSummary[] }) {
  const { t } = useMailTranslation();
  return (
    <ul aria-label={t('list.title')} className="m-0 list-none border-t border-hairline p-0">
      {threads.map((thread) => (
        <ThreadRow key={thread.reference} thread={thread} />
      ))}
    </ul>
  );
}
