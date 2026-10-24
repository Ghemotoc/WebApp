/**
 * NoticeReceived: "Report received", with the reference, the time of receipt and where the
 * receipt went (story S1-E10-02; DSA art. 16(4): confirmation of receipt; Regulation (EU)
 * 2021/784 art. 15: an order's time of receipt).
 *
 * Focus moves to its heading when it appears, so a screen reader reads the reference at once.
 * Who shows it: NoticePage, after a send. What it calls: nothing.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { brand } from '@/config/brand';
import type { NoticeRequest, NoticeResponse } from '@/schemas/notice';

/** What the panel needs. */
export interface NoticeReceivedProps {
  sent: NoticeRequest;
  answer: NoticeResponse;
  language: 'ro' | 'en';
  onAgain: () => void;
}

/**
 * The time of receipt in Romania time, as the acknowledgement email writes it.
 *
 * @param isoTime - the server's time of receipt
 * @param language - the page's language
 * @returns for example "25 October 2026, 11:00:00"
 */
function receiptTime(isoTime: string, language: 'ro' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-GB', {
    timeZone: 'Europe/Bucharest',
    dateStyle: 'long',
    timeStyle: 'medium',
  }).format(new Date(isoTime));
}

/**
 * The line about the receipt email: sent, not sent, or no email given.
 *
 * @returns the key in notices.json and its values
 */
function receiptLine(sent: NoticeRequest, answer: NoticeResponse): [string, { email?: string }] {
  if (sent.notifierEmail === undefined) return ['received.noEmail', {}];
  if (!answer.acknowledged) return ['received.unsent', {}];
  return ['received.emailed', { email: sent.notifierEmail }];
}

/**
 * Renders the panel.
 *
 * @returns the confirmation with the reference and the two ways on
 */
export function NoticeReceived({ sent, answer, language, onAgain }: NoticeReceivedProps) {
  const { t } = useTranslation('notices');
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  const time = receiptTime(answer.receivedAt, language);
  const isOrder = sent.kind === 'removal_order';
  const [lineKey, lineValues] = receiptLine(sent, answer);
  return (
    <section
      aria-labelledby="notice-received-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2
        id="notice-received-heading"
        ref={headingRef}
        tabIndex={-1}
        className="m-0 font-heading text-[26px] font-bold text-heading"
      >
        {t('received.heading')}
      </h2>
      <p className="m-0 text-body">
        {t(isOrder ? 'received.orderBody' : 'received.body', {
          reference: answer.reference,
          time,
        })}
      </p>
      <p className="m-0 text-body">{t(lineKey, lineValues)}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onAgain}>
          {t('received.again')}
        </Button>
        <Link to="/" className="inline-flex min-h-11 items-center text-link underline">
          {t('received.home', { productName: brand.productName })}
        </Link>
      </div>
    </section>
  );
}
