/**
 * LabelCheckbox: one tick box with a bold label and a plain hint under it, for the story
 * labels (story S1-E3-06; board NewStory 4.2, "Labels": Fan fiction, Parody).
 *
 * Who uses it: StoryLabelsSection. What it is: a real <input type="checkbox"> with its label,
 * the hint linked through aria-describedby (WCAG 1.3.1), a 24 px box (WCAG 2.5.8).
 */
import type { ReactNode } from 'react';

/** What the tick box needs. */
export interface LabelCheckboxProps {
  id: string;
  label: string;
  hint: ReactNode;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
}

/**
 * Renders the tick box.
 *
 * @returns the box, its label and hint
 */
export function LabelCheckbox({ id, label, hint, isChecked, onChange }: LabelCheckboxProps) {
  const hintId = `${id}-hint`;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={isChecked}
        aria-describedby={hintId}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-6 shrink-0 cursor-pointer accent-(--link)"
      />
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        <p id={hintId} className="m-0 text-[13px] leading-normal text-meta">
          {hint}
        </p>
      </div>
    </div>
  );
}
