/**
 * RelationshipClashPanel: the warning shown when a new relationship clashes with one already
 * there (bundle G10 ATLAS, part b; handoff A5: "This clashes with a relationship already here",
 * an explanation, an optional "How both are true" note, Go back and Save anyway; never a block).
 *
 * The note is the relationship's own private note (only the writer sees it; readers never get
 * it), so "How both are true" takes the place of the plain note box while the panel is open.
 * The panel takes the focus when it opens, so a screen reader hears the warning first. Who uses
 * it: AddRelationshipForm. What it calls: the onNote, onBack and onSave props.
 */
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the panel needs. */
export interface RelationshipClashPanelProps {
  idPrefix: string;
  /** The relationship already saved, as a sentence. */
  existing: string;
  /** The one about to be saved, as a sentence. */
  proposed: string;
  note: string;
  onNote: (note: string) => void;
  /** Closes the panel without saving. */
  onBack: () => void;
  /** Saves the relationship as it is. */
  onSave: () => void;
}

/**
 * Renders the warning, the note box and the two buttons.
 *
 * @returns the panel
 */
export function RelationshipClashPanel({
  idPrefix,
  existing,
  proposed,
  note,
  onNote,
  onBack,
  onSave,
}: RelationshipClashPanelProps) {
  const { t } = useAtlasTranslation();
  const panel = useRef<HTMLDivElement>(null);

  // The warning is read out first: the panel takes the focus as it opens.
  useEffect(() => {
    panel.current?.focus();
  }, []);

  return (
    <div ref={panel} tabIndex={-1} className="flex flex-col gap-3 outline-none">
      <Notice tone="warning" title={t('connections.clash.title')}>
        <span className="block">{t('connections.clash.explain', { existing, proposed })}</span>
        <span className="block">{t('connections.clash.bothTrue')}</span>
      </Notice>
      <Textarea
        id={`${idPrefix}-clash-note`}
        label={t('connections.clash.note')}
        hint={t('connections.clash.noteHint')}
        placeholder={t('connections.clash.notePlaceholder')}
        maxLength={1000}
        value={note}
        onChange={(event) => onNote(event.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          {t('connections.clash.back')}
        </Button>
        <Button type="button" variant="primary" onClick={onSave}>
          {t('connections.clash.save')}
        </Button>
      </div>
    </div>
  );
}
