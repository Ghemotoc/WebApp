/**
 * MarketingDetailItem: one of the writer's own marketing details on the Marketing page, such as
 * "Newsletter" (bundle GAPS-2b; board AtlasMarketing, "Add detail").
 *
 * A box named after the detail that saves by itself, like the page's other notes, then "Edit
 * detail": the name with "Save" and "Cancel", and "Delete detail", which asks first, in place.
 * The box's ID is "atlas-marketing-detail-<id>", where a search result for the detail lands.
 * Who uses it: MarketingDetails. What it calls: useStoryMarketing's saveDetail and deleteDetail.
 */
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { MarketingDetail } from '../api/marketing';
import { useStoryMarketing } from '../hooks/useStoryMarketing';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanTextField } from './PlanTextField';

/** What the item needs. */
export interface MarketingDetailItemProps {
  slug: string;
  detail: MarketingDetail;
}

/** "Delete detail", then the question with "Keep detail" and "Delete detail". */
function DeleteDetail({ name, onDelete }: { name: string; onDelete: () => void }) {
  const { t } = useAtlasTranslation();
  const [isAsking, setIsAsking] = useState(false);
  if (!isAsking) {
    return (
      <Button variant="secondary" className="self-start" onClick={() => setIsAsking(true)}>
        {t('marketing.details.delete')}
      </Button>
    );
  }
  return (
    <div role="group" aria-label={t('marketing.details.delete')} className="flex flex-col gap-2">
      <p className="m-0 text-sm text-body">{t('marketing.details.deleteQuestion', { name })}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setIsAsking(false)}>
          {t('marketing.details.keep')}
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          {t('marketing.details.delete')}
        </Button>
      </div>
    </div>
  );
}

/** The "Edit detail" button, named after its detail for a screen reader. */
function EditDetailButton({ name, onOpen }: { name: string; onOpen: () => void }) {
  const { t } = useAtlasTranslation();
  return (
    <Button
      variant="secondary"
      className="h-8 self-start px-3 text-xs"
      aria-label={t('marketing.details.editNamed', { name })}
      onClick={onOpen}
    >
      {t('marketing.details.edit')}
    </Button>
  );
}

/** "Edit detail": one button, or the open name box with Save, Cancel and Delete detail. */
function EditDetail({ slug, detail }: MarketingDetailItemProps) {
  const { t } = useAtlasTranslation();
  const { saveDetail, deleteDetail } = useStoryMarketing(slug);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(detail.name);
  const [message, setMessage] = useState<string | null>(null);

  const boxId = `atlas-marketing-detail-name-${detail.id}`;
  // Opening the form puts the cursor in its box, so the keyboard carries on from the button.
  useEffect(() => {
    if (isOpen) document.getElementById(boxId)?.focus();
  }, [isOpen, boxId]);

  /** Saves the new name and closes, or says why not. */
  async function save() {
    setMessage(null);
    if (name.trim() === '') return setMessage(t('marketing.details.nameRequired'));
    await saveDetail(detail.id, { name })
      .then(() => setIsOpen(false))
      .catch(() => setMessage(t('marketing.details.saveFailed')));
  }

  if (!isOpen) return <EditDetailButton name={detail.name} onOpen={() => setIsOpen(true)} />;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <form
        className="flex min-w-0 flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <div className="min-w-0 flex-1 basis-48">
          <TextInput
            id={boxId}
            label={t('marketing.details.name')}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button type="submit">{t('marketing.details.save')}</Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)}>
          {t('marketing.details.cancel')}
        </Button>
      </form>
      <DeleteDetail
        name={detail.name}
        onDelete={() => {
          setMessage(null);
          deleteDetail(detail.id).catch(() => setMessage(t('marketing.details.deleteFailed')));
        }}
      />
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </div>
  );
}

/**
 * Renders the detail.
 *
 * @returns the detail's box and "Edit detail"
 */
export function MarketingDetailItem({ slug, detail }: MarketingDetailItemProps) {
  const { saveDetail } = useStoryMarketing(slug);
  return (
    <div data-testid="atlas-marketing-detail" className="flex min-w-0 flex-col gap-2">
      <PlanTextField
        id={`atlas-marketing-detail-${detail.id}`}
        label={detail.name}
        isMultiline
        maxLength={5000}
        savedValue={detail.text}
        save={async (text) => saveDetail(detail.id, { text })}
      />
      {/* A fresh form for each name, so a rename closes it and shows the new name. */}
      <EditDetail key={detail.name} slug={slug} detail={detail} />
    </div>
  );
}
