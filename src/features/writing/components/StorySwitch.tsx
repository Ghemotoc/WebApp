/**
 * StorySwitch: one on/off switch in Story settings › Status and comments (story S1-E3-05; board
 * NewStory 4.2 section 4): role="switch", 60 x 34 px, with the line saying what on or off means
 * now beside it. There is no shared Switch component yet; CALM-4 and CALM-5 restyle this one.
 * Moved out of StoryStatusSection.tsx in bundle CALM-8, when "Pause new comments" became its
 * third user.
 * Who uses it: StoryStatusSection (quote cards, picture sharing) and CommentPauseField.
 * What it calls: nothing; it reports the flip upwards.
 */

/** What one switch needs. */
export interface StorySwitchProps {
  /** Starts the ids of the label and the note, which must be unique on the page. */
  idPrefix: string;
  label: string;
  isOn: boolean;
  /** The line beside the switch saying what on or off means now. */
  note: string;
  onToggle: () => void;
}

/**
 * One on/off switch as the board draws it: the label above, the switch and its note beside it.
 * Screen readers hear the label, "switch", on or off, and the note (aria-describedby).
 *
 * @returns the label, the switch and the note
 */
export function StorySwitch({ idPrefix, label, isOn, note, onToggle }: StorySwitchProps) {
  const labelId = `${idPrefix}-label`;
  const noteId = `${idPrefix}-note`;
  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm font-semibold text-ink">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          aria-labelledby={labelId}
          aria-describedby={noteId}
          onClick={onToggle}
          className={`relative inline-flex h-[34px] w-[60px] shrink-0 items-center rounded-full border transition-colors ${
            isOn ? 'border-chip-on bg-chip-on' : 'border-dashed-border bg-panel'
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-[3px] size-[26px] rounded-full bg-surface shadow-card transition-[left] ${
              isOn ? 'left-[29px]' : 'left-[3px]'
            }`}
          />
        </button>
        <p id={noteId} className="m-0 text-sm text-body">
          {note}
        </p>
      </div>
    </div>
  );
}
