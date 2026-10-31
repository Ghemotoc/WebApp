/**
 * BibleSectionRow: one section in "Manage sections" (story S1-E17-17: "when I add, rename or
 * reorder one, then it saves; reordering also works with buttons, not only by dragging"; "only an
 * empty section can be deleted, after a second confirming click").
 *
 * The name box saves by itself (empty gives a default section its default name back), the handle
 * drags the row onto another, Up and Down do the same by keyboard or on a phone, and Delete asks
 * twice. Who uses it: BibleSectionsManager. What it calls: the changers it is given.
 */
import type { DragEvent } from 'react';

import { Button } from '@/components/ui/Button';

import type { BibleSection } from '../api/bible';
import { useBibleSectionName } from '../hooks/useBibleSectionName';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanTextField } from './PlanTextField';
import { TwoStepDelete } from './TwoStepDelete';

/** The type a dragged section carries, so other drags (text, files) are ignored. */
export const sectionDragType = 'application/x-atlas-bible-section';

/** What the row needs. */
export interface BibleSectionRowProps {
  section: BibleSection;
  entryCount: number;
  isFirst: boolean;
  isLast: boolean;
  rename: (name: string) => Promise<void>;
  /** Moves this section to a place (from 1). */
  moveTo: (position: number) => void;
  /** Moves the dragged section to this one's place. */
  takeDrop: (draggedSectionId: string) => void;
  /** Deletes; resolves to 'not_empty' when it still has entries. */
  remove: () => Promise<'ok' | 'not_empty'>;
}

/** Up and Down, each disabled at its end. */
function MoveButtons({
  name,
  section,
  isFirst,
  isLast,
  moveTo,
}: Pick<BibleSectionRowProps, 'section' | 'isFirst' | 'isLast' | 'moveTo'> & { name: string }) {
  const { t } = useAtlasTranslation();
  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        disabled={isFirst}
        aria-label={t('bible.sections.moveUp', { name })}
        onClick={() => moveTo(section.position - 1)}
      >
        {t('bible.sections.up')}
      </Button>
      <Button
        variant="secondary"
        disabled={isLast}
        aria-label={t('bible.sections.moveDown', { name })}
        onClick={() => moveTo(section.position + 1)}
      >
        {t('bible.sections.down')}
      </Button>
    </div>
  );
}

/** The drag handle; Up and Down do the same for keyboards and phones, so it is hidden from them. */
function DragHandle({ sectionId, name }: { sectionId: string; name: string }) {
  const { t } = useAtlasTranslation();
  return (
    <span
      draggable
      aria-hidden="true"
      title={t('bible.sections.drag', { name })}
      className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-xl border border-control-border text-meta"
      onDragStart={(event) => {
        event.dataTransfer.setData(sectionDragType, sectionId);
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
        <circle cx="4" cy="4" r="1.6" />
        <circle cx="10" cy="4" r="1.6" />
        <circle cx="4" cy="10" r="1.6" />
        <circle cx="10" cy="10" r="1.6" />
        <circle cx="4" cy="16" r="1.6" />
        <circle cx="10" cy="16" r="1.6" />
      </svg>
    </span>
  );
}

/** The name box: saves by itself; a default section may be left empty to keep its own name. */
function SectionNameField({ section, rename }: Pick<BibleSectionRowProps, 'section' | 'rename'>) {
  const { t } = useAtlasTranslation();
  const defaultName = section.preset === null ? null : t(`bible.presets.${section.preset}`);
  return (
    <PlanTextField
      id={`atlas-bible-section-${section.id}`}
      label={t('bible.sections.name', { number: section.position })}
      hint={
        defaultName === null ? undefined : t('bible.sections.defaultHint', { name: defaultName })
      }
      savedValue={section.name}
      save={rename}
      isValid={(value) => defaultName !== null || value.trim() !== ''}
      invalidMessage={t('bible.sections.nameRequired')}
      maxLength={80}
    />
  );
}

/**
 * Renders the row.
 *
 * @returns the list item with the handle, name, count, move buttons and Delete
 */
export function BibleSectionRow(props: BibleSectionRowProps) {
  const { t } = useAtlasTranslation();
  const { section } = props;
  const name = useBibleSectionName()(section);

  /** A dragged section dropped here takes this place. */
  function drop(event: DragEvent<HTMLDivElement>) {
    const draggedId = event.dataTransfer.getData(sectionDragType);
    if (draggedId === '' || draggedId === section.id) return;
    event.preventDefault();
    props.takeDrop(draggedId);
  }

  return (
    <li data-testid="atlas-bible-section-row" className="border-b border-hairline last:border-b-0">
      {/* The drop zone for dragged sections; dragging is only a shortcut for Up and Down. */}
      <div
        role="presentation"
        className="flex flex-col gap-3 py-4"
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes(sectionDragType)) event.preventDefault();
        }}
        onDrop={drop}
      >
        <div className="flex flex-wrap items-start gap-3">
          <DragHandle sectionId={section.id} name={name} />
          <div className="min-w-0 flex-1 basis-56">
            <SectionNameField section={section} rename={props.rename} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-meta">
            {t('bible.sections.entries', { count: props.entryCount })}
          </span>
          <MoveButtons
            name={name}
            section={section}
            isFirst={props.isFirst}
            isLast={props.isLast}
            moveTo={props.moveTo}
          />
          <TwoStepDelete
            buttonLabel={t('bible.sections.delete')}
            buttonAccessibleName={t('bible.sections.deleteNamed', { name })}
            question={t('bible.sections.confirm', { name })}
            yesLabel={t('bible.sections.yes')}
            keepLabel={t('bible.sections.keep')}
            failedMessage={t('bible.sections.deleteFailed')}
            onDelete={async () =>
              (await props.remove()) === 'not_empty' ? t('bible.sections.notEmpty') : null
            }
          />
        </div>
      </div>
    </li>
  );
}
