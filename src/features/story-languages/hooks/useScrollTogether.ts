/**
 * useScrollTogether: keeps the original and the translation at the same paragraph while either
 * side scrolls (CALM-9, board D09 "Translate a chapter": the checkbox "Scroll both sides
 * together", on by default).
 *
 * How: each side is its own scroll box and marks every paragraph with data-paragraph="n". When
 * one side scrolls, the hook finds the paragraph at its top edge and how far into it the edge
 * is, then scrolls the other side so the same paragraph sits at its top, the same share of the
 * way in. The paragraphs differ in height between languages, so matching by paragraph (not by
 * pixels) keeps the two texts lined up.
 * Who uses it: SideBySidePapers. What it calls: browser APIs only.
 */
import { useEffect, type RefObject } from 'react';

/** Where a side's top edge is: which paragraph, and the share of it already scrolled past. */
interface ScrollPlace {
  index: number;
  share: number;
}

/**
 * Finds the paragraph at the box's top edge.
 *
 * @param box - one side's scroll box
 * @returns the place, or null while the box holds no paragraphs
 */
function placeOf(box: HTMLElement): ScrollPlace | null {
  const paragraphs = Array.from(box.querySelectorAll<HTMLElement>('[data-paragraph]'));
  const boxTop = box.getBoundingClientRect().top;
  for (const [index, paragraph] of paragraphs.entries()) {
    const rect = paragraph.getBoundingClientRect();
    // The first paragraph that still reaches below the top edge is the one being read.
    if (rect.bottom > boxTop) {
      const share = rect.height > 0 ? Math.max(0, boxTop - rect.top) / rect.height : 0;
      return { index, share };
    }
  }
  return null;
}

/**
 * Scrolls a box so the place sits at its top edge.
 *
 * @param box - the side to move
 * @param place - where the other side is
 */
function scrollTo(box: HTMLElement, place: ScrollPlace) {
  const paragraph = box.querySelectorAll<HTMLElement>('[data-paragraph]')[place.index];
  if (paragraph === undefined) return;
  // offsetTop is measured from the box, because the box is the paragraphs' positioned parent.
  box.scrollTop = paragraph.offsetTop + paragraph.offsetHeight * place.share;
}

/**
 * Links the two boxes while `isOn` is true.
 *
 * @param left - the original's scroll box
 * @param right - the translation's scroll box
 * @param isOn - the checkbox "Scroll both sides together"
 */
export function useScrollTogether(
  left: RefObject<HTMLElement | null>,
  right: RefObject<HTMLElement | null>,
  isOn: boolean,
) {
  useEffect(() => {
    const leftBox = left.current;
    const rightBox = right.current;
    if (!isOn || leftBox === null || rightBox === null) return;
    // The side the reader moved leads; the other side's own scroll event is ignored until the
    // next frame, so the two never chase each other.
    let leader: HTMLElement | null = null;
    let frame = 0;
    const follow = (from: HTMLElement, to: HTMLElement) => () => {
      if (leader !== null && leader !== from) return;
      leader = from;
      const place = placeOf(from);
      if (place !== null) scrollTo(to, place);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        leader = null;
      });
    };
    const fromLeft = follow(leftBox, rightBox);
    const fromRight = follow(rightBox, leftBox);
    leftBox.addEventListener('scroll', fromLeft, { passive: true });
    rightBox.addEventListener('scroll', fromRight, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      leftBox.removeEventListener('scroll', fromLeft);
      rightBox.removeEventListener('scroll', fromRight);
    };
  }, [left, right, isOn]);
}
