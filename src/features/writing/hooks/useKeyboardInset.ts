/**
 * useKeyboardInset: how far the on-screen keyboard covers the bottom of the window, so the
 * editor's formatting bar can float just above it on tablets and phones (board D05, user story
 * 5.5: "The formatting bar floats above the keyboard").
 *
 * The visual viewport shrinks while a keyboard is open; the layout viewport (the window) does
 * not. The gap between their bottoms is the keyboard's height. Browsers without the visual
 * viewport API, and desktops, answer 0, so the bar sits at the bottom edge.
 * Who calls it: EditorToolbarDock. What it calls: window.visualViewport.
 */
import { useEffect, useState } from 'react';

/**
 * The pixels the keyboard covers at the bottom of the window.
 *
 * @returns 0 with no keyboard (or no visual viewport), the keyboard's height otherwise
 */
function coveredPixels(): number {
  const viewport = window.visualViewport;
  if (viewport === null || viewport === undefined) return 0;
  const covered = window.innerHeight - viewport.height - viewport.offsetTop;
  // A rounding pixel or two is not a keyboard.
  return covered > 2 ? Math.round(covered) : 0;
}

/**
 * Follows the keyboard as it opens, closes and resizes.
 *
 * @returns the covered height in pixels
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (viewport === null || viewport === undefined) return;
    /** Measures again whenever the visual viewport moves or changes size. */
    function measure() {
      setInset(coveredPixels());
    }
    measure();
    viewport.addEventListener('resize', measure);
    viewport.addEventListener('scroll', measure);
    return () => {
      viewport.removeEventListener('resize', measure);
      viewport.removeEventListener('scroll', measure);
    };
  }, []);
  return inset;
}
