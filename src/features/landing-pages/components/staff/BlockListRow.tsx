/**
 * BlockListRow: one block in the landing page editor's list of blocks, with Edit, Up, Down and
 * Remove (story S1-E11-14 criteria 3 and 4; the liquid glass layout of the canvas's
 * StaffWebsiteLandingEdit board, bundle G12c).
 *
 * The list names every block ("Block 2: Key dates"); Edit opens that block's fields in the editor
 * beside the list, so one block is edited at a time, as the board draws it. The open block says
 * "Editing", and a block the server asked to fix says "Needs a fix", so a problem in a closed
 * block is never hidden. Moving uses buttons, never dragging, so every change works from the
 * keyboard. The hero is fixed at the top, so its row has no Up, Down or Remove.
 * Who shows it: LandingEditorForm, once for each block. What it calls: canMove from lib/blocks.ts.
 */
import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import type { LandingContent } from '@/schemas/landingPages';

import { canCopyBlock, canMove } from '../../lib/blocks';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** What the row needs. */
interface BlockListRowProps {
  content: LandingContent;
  index: number;
  isOpen: boolean;
  needsFix: boolean;
  /** The id of the editor panel, for aria-controls. */
  editorId: string;
  onOpen: () => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  /** Copies the block below itself (S1-E11-35). */
  onCopy: () => void;
}

/**
 * Up, Down and Remove for a block that isn't the hero.
 *
 * @returns the buttons
 */
function MoveButtons({
  content,
  index,
  name,
  onMove,
  onRemove,
  onCopy,
}: Pick<BlockListRowProps, 'content' | 'index' | 'onMove' | 'onRemove' | 'onCopy'> & {
  name: string;
}) {
  const { t } = useLandingPageTranslation();
  return (
    <>
      <Button
        variant="secondary"
        disabled={!canMove(content, index, -1)}
        aria-label={t('editor.moveUp', { block: name })}
        onClick={() => onMove(-1)}
      >
        {t('editor.up')}
      </Button>
      <Button
        variant="secondary"
        disabled={!canMove(content, index, 1)}
        aria-label={t('editor.moveDown', { block: name })}
        onClick={() => onMove(1)}
      >
        {t('editor.down')}
      </Button>
      {canCopyBlock(content.blocks[index]?.kind ?? 'hero') && (
        <Button variant="secondary" aria-label={t('editor.copyBlock', { name })} onClick={onCopy}>
          {t('editor.copy')}
        </Button>
      )}
      <Button
        variant="destructive"
        aria-label={t('editor.removeBlock', { block: name })}
        onClick={onRemove}
      >
        {t('editor.remove')}
      </Button>
    </>
  );
}

/**
 * Renders the row.
 *
 * @returns a list item
 */
export function BlockListRow(props: BlockListRowProps) {
  const { t } = useLandingPageTranslation();
  const { content, index, isOpen, needsFix, editorId, onOpen } = props;
  const block = content.blocks[index];
  const name = t('editor.blockName', {
    number: index + 1,
    kind: t(`kinds.${block?.kind ?? 'text'}`),
  });
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="m-0 font-heading text-base font-bold text-heading">{name}</h3>
        {isOpen && <InfoPill tone="plum">{t('editor.editingPill')}</InfoPill>}
        {needsFix && <InfoPill tone="blush">{t('editor.needsFix')}</InfoPill>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          aria-label={t('editor.editBlock', { block: name })}
          aria-expanded={isOpen}
          aria-controls={editorId}
          onClick={onOpen}
        >
          {t('editor.edit')}
        </Button>
        {block?.kind !== 'hero' && <MoveButtons {...props} name={name} />}
      </div>
    </li>
  );
}
