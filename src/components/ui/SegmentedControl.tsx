/**
 * SegmentedControl: a few choices side by side in a recessed track, with a white "water bubble"
 * that slides to the picked one (bundle G3 COMPONENTS; handoff "Segmented control": nav, genre
 * bars, font picker, view switches, rating picker; motion "Water bubble", 280 ms ease-out).
 *
 * It is a radio group (handoff accessibility rules): each segment is a real radio button, hidden,
 * inside a visible label, so arrow keys move between segments, Space picks, and a screen reader
 * hears the group's name and "2 of 3". The picked segment sits on the bubble in bold, so the
 * choice shows by shape and weight, not colour alone (WCAG 1.4.1). Every segment is 44 px tall.
 * On a narrow screen the segments share the width in equal columns and may wrap their words; the
 * bubble follows the picked segment wherever it is. Reduce motion makes the slide instant
 * (index.css). The bubble is measured from the picked label, again whenever the control resizes.
 * Who uses it: Settings › Appearance (Mode) and, from later bundles, the other places the
 * handoff lists. What it calls: nothing; it reports the pick upwards.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { cn } from '@/lib/utils';

/** One choice. */
export interface SegmentedOption<Value extends string> {
  value: Value;
  label: string;
  /** The label's own language, when it differs from the page's ("Română" on an English page), so
   * screen readers say it right (WCAG 3.1.2). */
  lang?: string;
}

/** What the control needs. */
export interface SegmentedControlProps<Value extends string> {
  /** The group's name, read by screen readers, and shown above unless isLegendVisible is false. */
  legend: string;
  isLegendVisible?: boolean;
  /** The radio buttons' shared name; unique on the page. */
  name: string;
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  /** Equal columns at every width; otherwise equal columns on a phone and natural widths from
   * 640 px. */
  isFullWidth?: boolean;
}

/** Where the bubble sits inside the track, in pixels. */
type BubbleBox = Pick<CSSProperties, 'left' | 'top' | 'width' | 'height'>;

/**
 * Measures the picked segment so the bubble can sit under it, now and whenever the track
 * resizes (a narrow screen, a longer translation).
 *
 * @returns a ref for the track and the bubble's box (null until measured)
 */
function useBubbleBox(pickedIndex: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<BubbleBox | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (track === null) return undefined;
    // Step 1: read the picked label's place inside the track.
    const measure = () => {
      const picked = track.querySelectorAll<HTMLElement>('[data-segment]')[pickedIndex];
      if (picked === undefined) return;
      setBox({
        left: picked.offsetLeft,
        top: picked.offsetTop,
        width: picked.offsetWidth,
        height: picked.offsetHeight,
      });
    };
    measure();
    // Step 2: measure again when the track changes size (browsers without ResizeObserver skip it).
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [pickedIndex]);

  return { trackRef, box };
}

/**
 * Renders the control.
 *
 * @returns the fieldset
 */
export function SegmentedControl<Value extends string>({
  legend,
  isLegendVisible = true,
  name,
  options,
  value,
  onChange,
  isFullWidth = false,
}: SegmentedControlProps<Value>) {
  const pickedIndex = options.findIndex((option) => option.value === value);
  const { trackRef, box } = useBubbleBox(pickedIndex);
  const columns = { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` };
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className={isLegendVisible ? 'mb-2 p-0 text-[15px] font-bold text-ink' : 'sr-only'}>
        {legend}
      </legend>
      <div
        ref={trackRef}
        style={columns}
        className={cn(
          'segmented-track relative gap-1 rounded-[26px] p-1',
          isFullWidth ? 'grid' : 'grid sm:inline-flex sm:self-start sm:rounded-full',
        )}
      >
        {box !== null && pickedIndex >= 0 && (
          <span aria-hidden="true" className="segmented-bubble absolute rounded-full" style={box} />
        )}
        {options.map((option) => {
          const isPicked = option.value === value;
          return (
            <label
              key={option.value}
              lang={option.lang}
              data-segment
              className={cn(
                'relative z-[1] inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-2 text-center text-sm leading-tight text-ink sm:px-5',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--focus-ring)',
                isPicked ? 'font-bold' : 'font-medium',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isPicked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
