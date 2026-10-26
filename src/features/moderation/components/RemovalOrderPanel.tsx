/**
 * RemovalOrderPanel: on a removal order's case, the timeline that proves how it was handled and
 * "Emergency disable" (story S1-E10-09; Regulation (EU) 2021/784 art. 3(3): remove or disable
 * within one hour; art. 6: keep it six months; art. 11: tell the uploader unless the authority
 * says not to). Board 8.4's removal-order panel.
 *
 * Emergency disable takes the item down everywhere at once, decides the case, keeps the item for
 * six months, tells the authority by email and, if the box is ticked, the uploader with a
 * statement of reasons. Only staff on call for removal orders may press it; the database refuses
 * everyone else. Plain staff components, no doodles.
 * Who shows it: CasePage, only for an authority order. What it calls: useRemovalOrder.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { LabelRows } from '@/components/ui/LabelRows';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import type { OrderTimeline } from '../api/removalOrders';
import { useRemovalOrder } from '../hooks/useRemovalOrder';

/** The hook's result, passed down once. */
type OrderState = ReturnType<typeof useRemovalOrder>;

/**
 * The order's times, in Romania time, as label rows.
 *
 * @returns the rows
 */
function TimelineRows({ timeline }: { timeline: OrderTimeline }) {
  const { t, i18n } = useTranslation('moderation');
  const format = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Europe/Bucharest',
  });
  const timeOf = (isoTime: string | null) =>
    isoTime === null ? t('orders.notYet') : format.format(new Date(isoTime));
  const rows = [
    { label: t('orders.received'), value: timeOf(timeline.receivedAt) },
    { label: t('orders.deadline'), value: timeOf(timeline.deadlineAt) },
    {
      label: t('orders.alerted'),
      value: `${timeOf(timeline.alertedAt)} · ${timeline.onCallHandle === null ? t('orders.nobodyOnCall') : `@${timeline.onCallHandle}`}`,
    },
    { label: t('orders.acknowledgedRow'), value: timeOf(timeline.acknowledgedAt) },
    { label: t('orders.escalatedRow'), value: timeOf(timeline.escalatedAt) },
    { label: t('orders.disabled'), value: timeOf(timeline.disabledAt) },
    { label: t('orders.preserveUntil'), value: timeOf(timeline.preserveUntil) },
    { label: t('orders.authorityTold'), value: timeOf(timeline.authorityToldAt) },
    {
      label: t('orders.uploaderTold'),
      value: t(timeline.uploaderTold ? 'orders.yes' : 'orders.no'),
    },
  ];
  return <LabelRows rows={rows} />;
}

/**
 * The Emergency disable form: the note, the message to the uploader and whether to tell them.
 *
 * @returns the form
 */
function DisableForm({ order }: { order: OrderState }) {
  const { t } = useTranslation('moderation');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [tellUploader, setTellUploader] = useState(true);
  const [isMissing, setIsMissing] = useState(false);

  /** Needs a note (and a message when the uploader is told), then asks the database. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const missing = note.trim() === '' || (tellUploader && message.trim() === '');
    setIsMissing(missing);
    if (missing) return;
    // A refusal is shown from the hook's state below.
    await order
      .disable({ note: note.trim(), messageToPerson: message.trim(), tellUploader })
      .catch(() => undefined);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Textarea
        id="order-note"
        label={t('orders.note')}
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <label className="flex min-h-11 items-center gap-3 text-body">
        <input
          type="checkbox"
          className="size-5"
          checked={tellUploader}
          onChange={(event) => setTellUploader(event.target.checked)}
        />
        {t('orders.tellUploader')}
      </label>
      {tellUploader && (
        <Textarea
          id="order-message"
          label={t('orders.message')}
          hint={t('orders.messageHint')}
          rows={3}
          maxLength={4000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      )}
      {isMissing && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t('orders.missing')}
        </p>
      )}
      {order.disableFailure !== null && (
        <Notice tone="error">{t(`orders.failures.${order.disableFailure}`)}</Notice>
      )}
      <div>
        <Button type="submit" variant="destructive" disabled={order.isDisabling}>
          {t(order.isDisabling ? 'orders.disabling' : 'orders.disable')}
        </Button>
      </div>
    </form>
  );
}

/**
 * Renders the panel.
 *
 * @param props.caseId - the order's case
 * @param props.isOpen - whether the case is still open (Emergency disable is offered only then)
 * @returns the panel
 */
export function RemovalOrderPanel({ caseId, isOpen }: { caseId: string; isOpen: boolean }) {
  const { t } = useTranslation('moderation');
  const order = useRemovalOrder(caseId, true);
  return (
    <section
      aria-labelledby="order-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="order-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
        {t('orders.heading')}
      </h2>
      <p className="m-0 text-body">{t('orders.intro')}</p>
      {order.timeline !== null && <TimelineRows timeline={order.timeline} />}
      {order.hasDisabled && <Notice tone="success">{t('orders.done')}</Notice>}
      {isOpen && <DisableForm order={order} />}
    </section>
  );
}
