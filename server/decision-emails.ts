/**
 * The decision emails to people who used the public report form (story S1-E10-04; DSA art. 16(5):
 * the notifier is told the decision; Regulation (EU) 2021/784 art. 3(6): the authority is told
 * the removal and its time).
 *
 * Why it runs from a moderator's click: Cloudflare Pages has no scheduler, so the case page calls
 * POST /api/decision-emails right after a decision, and the queue's "Send waiting decision emails"
 * button catches any that failed. The request carries the moderator's own sign-in token, so the
 * database decides what they may send (admin_due_decision_emails() checks moderation staff and
 * safeguarding); no service key is used.
 *
 * What it does, in order:
 * 1. reads the due emails through admin_due_decision_emails() as the moderator;
 * 2. sends each in the notifier's language: the outcome only ("removed", "acted on" or "no
 *    breach found"), never someone else's sanction; an authority's order gets its own words;
 * 3. marks the ones that left with admin_mark_decision_emails_sent(), so a failed one stays due.
 * Never logged: the addresses or the notices (CLAUDE.md rule 12). The words are draft text that
 * moves into the admin-editable templates with S1-E11-19.
 * Who calls it: functions/api/decision-emails.ts on Cloudflare, server/pages-functions-plugin.ts
 * locally.
 */
import type { EmailSender, OutgoingEmail, SendEmail } from './contact';
import { formatReceiptTime } from './notice';

/** What the handler needs from its surroundings. */
export interface DecisionEmailOptions {
  supabaseUrl: string;
  anonKey: string;
  supportEmail: string;
  productName: string;
  sendEmail: SendEmail;
}

/** One due email, as admin_due_decision_emails() answers it. */
export interface DueDecisionEmail {
  notice_id: string;
  reference: string;
  kind: 'notice' | 'removal_order';
  language: 'ro' | 'en';
  notifier_email: string;
  outcome: 'removed' | 'acted' | 'no_action';
  decided_at: string;
}

/** What we did, in each language, as a reporter may hear it. */
const outcomeWords = {
  en: {
    removed: 'We removed the content you reported.',
    acted: 'We took action on the content you reported.',
    no_action:
      'We checked the content you reported and found that it doesn’t break our rules or the law.',
  },
  ro: {
    removed: 'Am eliminat conținutul raportat de tine.',
    acted: 'Am luat măsuri privind conținutul raportat de tine.',
    no_action: 'Am verificat conținutul raportat de tine și nu încalcă regulile noastre sau legea.',
  },
};

/** The rest of the email, in each language. */
const decisionWords = {
  en: {
    subject: (reference: string, product: string) =>
      `Our decision on your report (${reference}) · ${product}`,
    notice: (reference: string, outcome: string, time: string, product: string) =>
      `Your report ${reference}: our decision.\n\n${outcome}\n\nA person on our moderation team decided this on ${time} (Romania time). No automated system made the decision.\n\nIf you disagree, reply to this email within six months and quote ${reference}. A different moderator will look at it where possible.\n\nThe ${product} team`,
    order: (reference: string, outcome: string, time: string, product: string) =>
      `Our reference: ${reference}\n\n${outcome}\n\nTime of the decision: ${time} (Romania time).\n\nThe content and related data are preserved for six months, as Regulation (EU) 2021/784 art. 6 requires.\n\nThe ${product} team`,
  },
  ro: {
    subject: (reference: string, product: string) =>
      `Decizia noastră privind raportarea ta (${reference}) · ${product}`,
    notice: (reference: string, outcome: string, time: string, product: string) =>
      `Raportarea ta ${reference}: decizia noastră.\n\n${outcome}\n\nO persoană din echipa noastră de moderare a decis pe ${time} (ora României). Niciun sistem automat nu a luat decizia.\n\nDacă nu ești de acord, răspunde la acest email în cel mult șase luni și menționează ${reference}. Un alt moderator se va uita, unde se poate.\n\nEchipa ${product}`,
    order: (reference: string, outcome: string, time: string, product: string) =>
      `Referința noastră: ${reference}\n\n${outcome}\n\nOra deciziei: ${time} (ora României).\n\nConținutul și datele legate de el sunt păstrate șase luni, așa cum cere art. 6 din Regulamentul (UE) 2021/784.\n\nEchipa ${product}`,
  },
};

/** An order's outcome, said to the authority. */
const orderOutcomeWords = {
  en: {
    removed:
      'We removed the content named in your removal order. It is no longer available anywhere on our service.',
    acted: 'We acted on your removal order.',
    no_action:
      'We did not remove the content named in your removal order. We will write separately with our reasons.',
  },
  ro: {
    removed:
      'Am eliminat conținutul indicat în ordinul de eliminare. Nu mai este disponibil nicăieri în serviciul nostru.',
    acted: 'Am dat curs ordinului de eliminare.',
    no_action:
      'Nu am eliminat conținutul indicat în ordinul de eliminare. Vă vom scrie separat motivele.',
  },
};

/**
 * The email for one due decision.
 *
 * @param due - the notice, its language and the outcome
 * @param productName - the product's name (src/config/brand.ts)
 * @returns the email to send
 */
export function decisionEmail(due: DueDecisionEmail, productName: string): OutgoingEmail {
  const words = decisionWords[due.language];
  const time = formatReceiptTime(due.decided_at, due.language);
  const isOrder = due.kind === 'removal_order';
  const outcome = isOrder
    ? orderOutcomeWords[due.language][due.outcome]
    : outcomeWords[due.language][due.outcome];
  const body = isOrder
    ? words.order(due.reference, outcome, time, productName)
    : words.notice(due.reference, outcome, time, productName);
  return { to: due.notifier_email, subject: words.subject(due.reference, productName), text: body };
}

/**
 * Calls one of the database's functions as the signed-in moderator.
 *
 * @param name - the function's name
 * @param body - its arguments
 * @param token - the moderator's sign-in token
 * @param options - where the database is
 * @returns the response, or null when the database couldn't be reached
 */
async function callAsModerator(
  name: string,
  body: Record<string, unknown>,
  token: string,
  options: DecisionEmailOptions,
): Promise<Response | null> {
  return fetch(`${options.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: options.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => null);
}

/**
 * Sends each email, carrying on past a failure.
 *
 * @param dueEmails - what is due
 * @param options - the inbox, the product name and how to send
 * @returns the IDs of the notices whose email left
 */
async function sendEach(
  dueEmails: DueDecisionEmail[],
  options: DecisionEmailOptions,
): Promise<string[]> {
  const from: EmailSender = { name: `${options.productName} team`, email: options.supportEmail };
  const sentIds: string[] = [];
  for (const due of dueEmails) {
    try {
      await options.sendEmail(decisionEmail(due, options.productName), from);
      sentIds.push(due.notice_id);
    } catch {
      // It stays due; the queue's button tries again.
    }
  }
  return sentIds;
}

/**
 * Answers POST /api/decision-emails.
 *
 * @param request - the request, with the moderator's token in Authorization
 * @param options - the database, the inbox and how to send
 * @returns 200 with { sent, failed }; 401 without a token; 403 when the database refuses the
 *   caller; 503 when the database can't be reached
 * Errors: none thrown; nothing is logged (CLAUDE.md rule 12).
 */
export async function handleDecisionEmails(
  request: Request,
  options: DecisionEmailOptions,
): Promise<Response> {
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  // Step 1: the moderator's own token; the database checks what it allows.
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token === '') return json({ error: 'signed_out' }, 401);
  // Step 2: what is due.
  const dueResponse = await callAsModerator('admin_due_decision_emails', {}, token, options);
  if (dueResponse === null) return json({ error: 'unavailable' }, 503);
  if (!dueResponse.ok) return json({ error: 'forbidden' }, 403);
  const dueEmails = (await dueResponse.json()) as DueDecisionEmail[];
  // Step 3: send, then mark only what left.
  const sentIds = await sendEach(dueEmails, options);
  if (sentIds.length > 0) {
    const marked = await callAsModerator(
      'admin_mark_decision_emails_sent',
      { notice_ids: sentIds },
      token,
      options,
    );
    if (marked === null || !marked.ok) return json({ error: 'unavailable' }, 503);
  }
  return json({ sent: sentIds.length, failed: dueEmails.length - sentIds.length }, 200);
}
