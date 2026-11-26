/**
 * BoardCardMenu: a chapter card's move menu on the chapter board (story S1-E17-19: "earlier,
 * later, previous act, next act … by keyboard or on a phone"; CALM-9, board E28: the four moves
 * sit behind one round "…" button on each card; WCAG 2.5.7, dragging has a single-pointer
 * alternative).
 *
 * A WAI-ARIA menu button: Enter, Space or the down arrow opens the menu on its first item; the
 * arrow keys, Home and End move between items; Escape closes it and puts focus back on the
 * button; Tab or a click outside closes it. A move that can't go anywhere (Earlier on the first
 * card) stays in the list, marked unavailable, so the list never changes shape.
 * Who uses it: BoardCard. What it calls: RowMoreMenu, with the move handlers it is given.
 */
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { RowMoreMenu } from './RowMoreMenu';

/** What the menu needs: the card's title (for the button's name) and one handler per move. */
export interface BoardCardMenuProps {
  title: string;
  onEarlier: (() => void) | null;
  onLater: (() => void) | null;
  onPreviousAct: (() => void) | null;
  onNextAct: (() => void) | null;
}

/** The four moves in the menu's order, each with its text key and its handler. */
function menuItems(moves: Omit<BoardCardMenuProps, 'title'>) {
  return [
    { key: 'earlier', onMove: moves.onEarlier },
    { key: 'later', onMove: moves.onLater },
    { key: 'previousAct', onMove: moves.onPreviousAct },
    { key: 'nextAct', onMove: moves.onNextAct },
  ];
}

/**
 * Renders the "…" button and, while open, its menu of moves.
 *
 * @returns the button and its menu
 */
export function BoardCardMenu({ title, ...moves }: BoardCardMenuProps) {
  const { t } = useAtlasTranslation();
  // Each move with its words; RowMoreMenu draws the button, the menu and the keys.
  const items = menuItems(moves).map((item) => ({
    key: item.key,
    label: t(`storyline.board.moves.${item.key}`),
    onSelect: item.onMove,
  }));
  return <RowMoreMenu label={t('storyline.board.moves.group', { title })} items={items} />;
}
