/**
 * ClassicCard: one classic on /staff/classics (story S1-E11-16): its title, author, status,
 * the public-domain check and its chapters, with Edit details, the text form, Publish and
 * Unpublish.
 *
 * Who shows it: ClassicsPage. What it calls: ClassicWorkForm, ClassicTextForm, ReasonForm
 * (unpublishing needs a reason for the audit log), ClassicTypoFix (16b: a typo fix in a published
 * work) and the page's onChange / onSave. A work imported from a research list says its details
 * need checking until staff save them (16b).
 * Plain components, no doodles (staff screens).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import { ReasonForm } from '@/features/moderation/components/ReasonForm';

import type { ClassicDetails, ClassicWork } from '../../api/classics';
import type { ClassicChange } from '../../hooks/useClassics';

import type { NewAuthor } from './ClassicAuthorFields';
import { ClassicTextForm } from './ClassicTextForm';
import { ClassicTypoFix } from './ClassicTypoFix';
import { ClassicWorkForm } from './ClassicWorkForm';
import { FreeMarketsList } from './FreeMarketsList';

/** What the card needs. */
export interface ClassicCardProps {
  work: ClassicWork;
  authors: Parameters<typeof ClassicWorkForm>[0]['authors'];
  isChanging: boolean;
  onChange: (change: ClassicChange) => Promise<unknown>;
  onSave: (
    storyId: string | null,
    details: ClassicDetails,
    newAuthor: NewAuthor | null,
  ) => Promise<unknown>;
}

/** Which panel of the card is open. */
type OpenPanel = 'none' | 'details' | 'unpublish' | 'typo';

/**
 * The card's buttons, as the work's state allows.
 *
 * @returns the button row
 */
function CardButtons({
  work,
  isChanging,
  onOpen,
  onPublish,
}: {
  work: ClassicWork;
  isChanging: boolean;
  onOpen: (panel: OpenPanel) => void;
  onPublish: () => void;
}) {
  const { t } = useTranslation('staff');
  const publishedCount = work.chapters.filter((chapter) => chapter.status === 'published').length;
  const canPublish = work.chapters.length > 0 && publishedCount < work.chapters.length;
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => onOpen('details')}>
        {t('classics.card.editDetails')}
      </Button>
      {canPublish && (
        <Button disabled={isChanging} onClick={onPublish}>
          {t('classics.card.publish')}
        </Button>
      )}
      {publishedCount > 0 && (
        <Button variant="secondary" onClick={() => onOpen('typo')}>
          {t('classics.card.fixTypo')}
        </Button>
      )}
      {publishedCount > 0 && (
        <Button variant="secondary" onClick={() => onOpen('unpublish')}>
          {t('classics.card.unpublish')}
        </Button>
      )}
    </div>
  );
}

/**
 * The open panel under the buttons: the details form, or the unpublish reason.
 *
 * @returns the panel, or nothing
 */
function CardPanel({
  openPanel,
  onClose,
  ...card
}: ClassicCardProps & { openPanel: OpenPanel; onClose: () => void }) {
  const { t } = useTranslation('staff');
  const { work, authors, isChanging, onChange, onSave } = card;
  return (
    <>
      {openPanel === 'details' && (
        <ClassicWorkForm
          initial={work}
          authors={authors}
          isSaving={isChanging}
          onSave={async (details, newAuthor) => {
            await onSave(work.storyId, details, newAuthor);
            onClose();
          }}
          onCancel={() => onClose()}
        />
      )}
      {openPanel === 'typo' && <ClassicTypoFix work={work} />}
      {openPanel === 'unpublish' && (
        <ReasonForm
          id={`classic-unpublish-${work.storyId}`}
          label={t('classics.card.unpublishReason')}
          confirmLabel={t('classics.card.unpublishConfirm')}
          isBusy={isChanging}
          onConfirm={async (reason) => {
            await onChange({ kind: 'unpublish', storyId: work.storyId, reason });
            onClose();
          }}
          onCancel={() => onClose()}
        />
      )}
    </>
  );
}

/**
 * Renders the card.
 *
 * @returns the card
 */
export function ClassicCard({ work, authors, isChanging, onChange, onSave }: ClassicCardProps) {
  const { t } = useTranslation('staff');
  const [openPanel, setOpenPanel] = useState<OpenPanel>('none');
  const isLive = work.chapters.some((chapter) => chapter.status === 'published');
  const headingId = `classic-${work.storyId}`;
  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="m-0 font-heading text-xl font-bold text-heading">
          {work.title}
        </h3>
        <InfoPill tone={isLive ? 'sage' : 'neutral'}>
          {t(isLive ? 'classics.card.live' : 'classics.card.draft')}
        </InfoPill>
        {!work.detailsChecked && <InfoPill tone="gold">{t('classics.card.checkDetails')}</InfoPill>}
      </div>
      <p className="m-0 text-body">
        {t('classics.card.byline', {
          name: work.authorName,
          year: work.authorDiedYear,
          count: work.chapters.length,
        })}
      </p>
      <FreeMarketsList freeMarkets={work.freeMarkets} />
      {isLive && (
        <Link to={`/s/${work.slug}`} className="font-semibold underline underline-offset-2">
          {t('classics.card.open')}
        </Link>
      )}
      <CardButtons
        work={work}
        isChanging={isChanging}
        onOpen={(panel) => setOpenPanel(openPanel === panel ? 'none' : panel)}
        onPublish={() => void onChange({ kind: 'publish', storyId: work.storyId })}
      />
      <CardPanel
        openPanel={openPanel}
        onClose={() => setOpenPanel('none')}
        work={work}
        authors={authors}
        isChanging={isChanging}
        onChange={onChange}
        onSave={onSave}
      />
      {!work.wasPublished && (
        <ClassicTextForm
          storyId={work.storyId}
          isSaving={isChanging}
          onSave={(chapters) => onChange({ kind: 'text', storyId: work.storyId, chapters })}
        />
      )}
    </article>
  );
}
