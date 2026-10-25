/**
 * CommentReactions: the reaction chips under a comment and the "Add a reaction" picker
 * (story S1-E6-02; board 3.5, comment 1).
 *
 * - A chip for every kind someone picked, in the board's order: its icon and count. The reader's
 *   own is filled plum with a tick and aria-pressed (DoD pill system: never colour alone). Its
 *   name is read out as "Heart, 4, your reaction".
 * - "Add a reaction" (the dashed + button) opens a group of the six; picking one sets it, picking
 *   the reader's own again takes it away (one per person, criterion 1). Escape closes the group.
 * - A visitor sees the counts only. The database refuses a read-only account, and the reason
 *   shows under the row.
 * Who uses it: CommentItem, in CommentActions' `before` slot. What it calls: useReactToComment.
 */
import { useRef, useState, type KeyboardEvent } from 'react';

import { CheckIcon } from '@/components/icons/CheckIcon';
import { useSession } from '@/features/auth/hooks/useSession';
import type { ChapterAddress } from '@/features/reading/api/likes';
import { cn } from '@/lib/utils';

import type { ChapterComment } from '../api/comments';
import {
  REACTION_KINDS,
  type CommentReactions as Reactions,
  type ReactionKind,
} from '../api/reactions';
import { useReactToComment } from '../hooks/useReactToComment';
import { useCommentsTranslation } from '../registerCommentsTranslations';

import { ReactionIcon } from './ReactionIcon';

/** The chip's shape: 36 px tall, its ::after layer making the touch target 44 px (DoD). */
const chipShape =
  "relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full border px-3.5 text-sm leading-none font-semibold whitespace-nowrap after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']";

/** The kinds that have a chip: picked at least once, in the board's order. */
function pickedKinds(reactions: Reactions): ReactionKind[] {
  return REACTION_KINDS.filter((kind) => (reactions.counts[kind] ?? 0) > 0);
}

/**
 * One chip. For a visitor it is plain text; for a signed-in reader a toggle button.
 *
 * @returns the chip
 */
function ReactionChip(props: {
  kind: ReactionKind;
  count: number;
  isMine: boolean;
  onPick: (() => void) | null;
}) {
  const { t, i18n } = useCommentsTranslation();
  const name = t(`reactions.names.${props.kind}`);
  const count = props.count.toLocaleString(i18n.language);
  const label = props.isMine
    ? t('reactions.chipMine', { name, count })
    : t('reactions.chip', { name, count });
  const look = props.isMine
    ? 'border-chip-on bg-chip-on text-chip-on-text'
    : 'border-control-border bg-surface text-heading';
  // Step 1: a visitor can't react, so the chip only says how many.
  if (props.onPick === null) {
    return (
      <span className={cn(chipShape, look)}>
        <ReactionIcon kind={props.kind} size={16} />
        <span aria-hidden="true">{count}</span>
        <span className="sr-only">{label}</span>
      </span>
    );
  }
  // Step 2: a signed-in reader toggles it; the name says whether it is theirs.
  return (
    <button
      type="button"
      aria-pressed={props.isMine}
      aria-label={label}
      onClick={props.onPick}
      className={cn(chipShape, look, !props.isMine && 'hover:bg-tint')}
    >
      {props.isMine && <CheckIcon />}
      <ReactionIcon kind={props.kind} size={16} />
      {count}
    </button>
  );
}

/**
 * The open picker: the six reactions as 44 px buttons.
 *
 * @returns the group
 */
function ReactionPicker(props: {
  mine: ReactionKind | null;
  onPick: (kind: ReactionKind) => void;
  onClose: () => void;
}) {
  const { t } = useCommentsTranslation();
  // Escape closes the picker and puts focus back on "Add a reaction" (the caller does that).
  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') props.onClose();
  };
  return (
    <div
      role="group"
      aria-label={t('reactions.pick')}
      className="mt-2 inline-flex flex-wrap gap-1 rounded-full border border-hairline bg-surface p-1 shadow-[0_12px_24px_-16px_rgba(38,20,46,0.35)]"
    >
      {REACTION_KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          aria-label={t(`reactions.names.${kind}`)}
          aria-pressed={props.mine === kind}
          onClick={() => props.onPick(kind)}
          onKeyDown={closeOnEscape}
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-full',
            props.mine === kind ? 'bg-chip-on text-chip-on-text' : 'text-heading hover:bg-tint',
          )}
        >
          <ReactionIcon kind={kind} size={18} />
        </button>
      ))}
    </div>
  );
}

/**
 * Renders a comment's reactions. Only a live comment has them (a marker or a hidden comment
 * can't be reacted to).
 *
 * @returns the chips, the add button and the picker, or nothing
 */
export function CommentReactions({
  address,
  comment,
}: {
  address: ChapterAddress;
  comment: ChapterComment;
}) {
  const { t } = useCommentsTranslation();
  const { userId } = useSession();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const addButton = useRef<HTMLButtonElement>(null);
  const reacting = useReactToComment(address, comment.id);
  if (comment.state !== 'live') return null;
  const { reactions } = comment;
  const isSignedIn = userId !== null;
  // Picking the reader's own kind takes it away; the database does the same check.
  const pick = (kind: ReactionKind) => {
    reacting.react(kind === reactions.mine ? null : kind);
    setIsPickerOpen(false);
  };
  const closePicker = () => {
    setIsPickerOpen(false);
    addButton.current?.focus();
  };
  return (
    <div className="flex basis-full flex-col items-start sm:basis-auto">
      <div className="flex flex-wrap items-center gap-1.5">
        {pickedKinds(reactions).map((kind) => (
          <ReactionChip
            key={kind}
            kind={kind}
            count={reactions.counts[kind] ?? 0}
            isMine={reactions.mine === kind}
            onPick={isSignedIn ? () => pick(kind) : null}
          />
        ))}
        {isSignedIn && (
          <button
            ref={addButton}
            type="button"
            aria-label={t('reactions.add')}
            aria-expanded={isPickerOpen}
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-control-border text-body hover:bg-tint"
          >
            <PlusIcon />
          </button>
        )}
      </div>
      {isPickerOpen && <ReactionPicker mine={reactions.mine} onPick={pick} onClose={closePicker} />}
      {reacting.failure !== null && (
        <p role="alert" className="m-0 mt-1 text-sm text-destructive">
          {t(
            `reactions.failures.${reacting.failure.failure === 'read_only' ? 'read_only' : 'other'}`,
          )}
        </p>
      )}
    </div>
  );
}

/** The + on "Add a reaction" (a plain icon: plus is allowed, DoD design rules). */
function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
