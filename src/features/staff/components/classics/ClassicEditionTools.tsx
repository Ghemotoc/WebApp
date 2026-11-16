/**
 * ClassicEditionTools: one edition of a classic, opened under the editions table on
 * /staff/classics (bundle TRANSLATE-1d; board TrStaff; Robert, 16 Nov 2026).
 *
 * What staff do here: change the edition's details, add its text while it has never been live
 * (its chapters are matched to the original's in order), publish it, fix a typo in a live chapter
 * and unpublish it with a reason. The database decides each step again: publishing needs the
 * translation rights chosen and the original's chapters already live (admin_publish_classic()).
 *
 * Who shows it: ClassicEditionsPanel. What it calls: ClassicEditionForm, ClassicTextForm,
 * ClassicTypoFix, ReasonForm and onChange (useClassics's change()). Plain components, no doodles
 * (staff screens).
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ReasonForm } from '@/features/moderation/components/ReasonForm';
import { languageOwnName } from '@/lib/language-names';

import type { ClassicWork } from '../../api/classics';
import type { ClassicChange } from '../../hooks/useClassics';

import { ClassicEditionForm } from './ClassicEditionForm';
import { ClassicTextForm } from './ClassicTextForm';
import { ClassicTypoFix } from './ClassicTypoFix';

/** What the tools need. */
export interface ClassicEditionToolsProps {
  edition: ClassicWork;
  isChanging: boolean;
  onChange: (change: ClassicChange) => Promise<unknown>;
  onClose: () => void;
}

/** Which extra panel is open under the buttons. */
type OpenTool = 'none' | 'typo' | 'unpublish';

/**
 * Publish, Fix a typo and Unpublish, as the edition's state allows.
 *
 * @returns the button row, or nothing while the edition has no text
 */
function EditionButtons({
  edition,
  isChanging,
  onPublish,
  onOpen,
}: {
  edition: ClassicWork;
  isChanging: boolean;
  onPublish: () => void;
  onOpen: (tool: OpenTool) => void;
}) {
  const { t } = useTranslation('staff');
  const live = edition.chapters.filter((chapter) => chapter.status === 'published').length;
  const canPublish = edition.chapters.length > 0 && live < edition.chapters.length;
  if (edition.chapters.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {canPublish && (
        <Button disabled={isChanging} onClick={onPublish}>
          {t('classics.editions.publish')}
        </Button>
      )}
      {live > 0 && (
        <Button variant="secondary" onClick={() => onOpen('typo')}>
          {t('classics.editions.fixTypo')}
        </Button>
      )}
      {live > 0 && (
        <Button variant="secondary" onClick={() => onOpen('unpublish')}>
          {t('classics.editions.unpublish')}
        </Button>
      )}
    </div>
  );
}

/**
 * The edition's text form, while no chapter of it has been live.
 *
 * @returns the heading, the hint and the text form
 */
function EditionText({ edition, isChanging, onChange }: Omit<ClassicEditionToolsProps, 'onClose'>) {
  const { t } = useTranslation('staff');
  const name = languageOwnName(edition.languageCode);
  return (
    <div className="flex flex-col gap-2">
      <h5 className="m-0 font-heading text-base font-bold text-heading">
        {t('classics.editions.textHeading', { language: name })}
      </h5>
      <p className="m-0 text-sm text-meta">{t('classics.editions.textHint')}</p>
      <ClassicTextForm
        storyId={edition.storyId}
        isSaving={isChanging}
        onSave={(chapters) => onChange({ kind: 'text', storyId: edition.storyId, chapters })}
      />
    </div>
  );
}

/**
 * Renders the edition's details form, its buttons and whichever panel is open.
 *
 * @returns the section, named after the edition's language
 */
export function ClassicEditionTools({
  edition,
  isChanging,
  onChange,
  onClose,
}: ClassicEditionToolsProps) {
  const { t } = useTranslation('staff');
  const [openTool, setOpenTool] = useState<OpenTool>('none');
  const headingId = `edition-tools-${edition.storyId}`;
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 border-t border-border pt-4"
    >
      <h4 id={headingId} className="m-0 font-heading text-lg font-bold text-heading">
        {t('classics.editions.form.editLegend', {
          language: languageOwnName(edition.languageCode),
        })}
      </h4>
      <ClassicEditionForm
        formId={edition.storyId}
        initial={edition}
        languageChoices={null}
        isSaving={isChanging}
        // Everything the form doesn't ask stays as the edition has it.
        onSave={(values) =>
          onChange({ kind: 'save', storyId: edition.storyId, details: { ...edition, ...values } })
        }
        onCancel={onClose}
      />
      <EditionButtons
        edition={edition}
        isChanging={isChanging}
        onPublish={() => void onChange({ kind: 'publish', storyId: edition.storyId })}
        onOpen={(tool) => setOpenTool(openTool === tool ? 'none' : tool)}
      />
      {!edition.wasPublished && (
        <EditionText edition={edition} isChanging={isChanging} onChange={onChange} />
      )}
      {openTool === 'typo' && <ClassicTypoFix work={edition} />}
      {openTool === 'unpublish' && (
        <ReasonForm
          id={`edition-unpublish-${edition.storyId}`}
          label={t('classics.card.unpublishReason')}
          confirmLabel={t('classics.card.unpublishConfirm')}
          isBusy={isChanging}
          onConfirm={async (reason) => {
            await onChange({ kind: 'unpublish', storyId: edition.storyId, reason });
            setOpenTool('none');
          }}
          onCancel={() => setOpenTool('none')}
        />
      )}
    </section>
  );
}
