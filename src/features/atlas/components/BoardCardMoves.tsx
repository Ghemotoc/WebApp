/**
 * BoardCardMoves: a card's four move buttons on the chapter board (story S1-E17-19: "earlier,
 * later, previous act, next act … by keyboard or on a phone"; WCAG 2.5.7, dragging has a
 * single-pointer alternative). Each button is disabled where its move can't go.
 *
 * Who uses it: BoardCard. What it calls: the move handlers it is given.
 */
import { Button } from '@/components/ui/Button';

import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the buttons need: the card's title (for the names) and one handler per move, or null. */
export interface BoardCardMovesProps {
  title: string;
  onEarlier: (() => void) | null;
  onLater: (() => void) | null;
  onPreviousAct: (() => void) | null;
  onNextAct: (() => void) | null;
}

/** One move button, disabled when its handler is null. */
function MoveButton({
  label,
  accessibleName,
  onMove,
}: {
  label: string;
  accessibleName: string;
  onMove: (() => void) | null;
}) {
  return (
    <Button
      variant="secondary"
      disabled={onMove === null}
      aria-label={accessibleName}
      onClick={() => onMove?.()}
    >
      {label}
    </Button>
  );
}

/**
 * Renders the buttons.
 *
 * @returns a labelled group of four buttons
 */
export function BoardCardMoves({
  title,
  onEarlier,
  onLater,
  onPreviousAct,
  onNextAct,
}: BoardCardMovesProps) {
  const { t } = useAtlasTranslation();
  return (
    <div
      role="group"
      aria-label={t('storyline.board.moves.group', { title })}
      className="flex flex-wrap gap-1.5"
    >
      <MoveButton
        label={t('storyline.board.moves.earlier')}
        accessibleName={t('storyline.board.moves.earlierNamed', { title })}
        onMove={onEarlier}
      />
      <MoveButton
        label={t('storyline.board.moves.later')}
        accessibleName={t('storyline.board.moves.laterNamed', { title })}
        onMove={onLater}
      />
      <MoveButton
        label={t('storyline.board.moves.previousAct')}
        accessibleName={t('storyline.board.moves.previousActNamed', { title })}
        onMove={onPreviousAct}
      />
      <MoveButton
        label={t('storyline.board.moves.nextAct')}
        accessibleName={t('storyline.board.moves.nextActNamed', { title })}
        onMove={onNextAct}
      />
    </div>
  );
}
