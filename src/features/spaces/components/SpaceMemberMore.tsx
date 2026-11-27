/**
 * SpaceMemberMore: the "•••" button at the end of a member's row and the short list of what may
 * be done to them, "Remove", "Block" and "Make a moderator" (bundle BOOKS-7, board F11).
 *
 * It is a disclosure, not a menu: the button says whether the list is open (aria-expanded) and the
 * list holds ordinary buttons, so a keyboard and a screen reader use it as they use any other
 * buttons. Who shows it: SpaceMemberRow, which keeps which list is open and what was picked.
 */
import { useId } from 'react';

import { ActionIcon } from '@/components/icons/ActionIcon';

import { useSpacesTranslation } from '../registerSpacesTranslations';

/** One thing that may be done to the member. */
export interface MemberChoice {
  key: string;
  label: string;
}

/** What the button and its list need. */
export interface SpaceMemberMoreProps {
  /** The member's name, for the button's name ("More for ilinca.r"). */
  name: string;
  choices: MemberChoice[];
  isOpen: boolean;
  onToggle: () => void;
  onPick: (key: string) => void;
}

/**
 * Renders the button and, while open, the list under the row.
 *
 * @returns the button and the list
 */
export function SpaceMemberMore({ name, choices, isOpen, onToggle, onPick }: SpaceMemberMoreProps) {
  const { t } = useSpacesTranslation();
  const listId = useId();
  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-label={t('members.more', { name })}
        onClick={onToggle}
        className="inline-flex size-11 items-center justify-center rounded-full text-ink-heading hover:bg-surface"
      >
        <ActionIcon name="more" size={20} />
      </button>
      <ul
        id={listId}
        hidden={!isOpen}
        className="m-0 flex list-none flex-wrap justify-end gap-2 p-0"
      >
        {choices.map((choice) => (
          <li key={choice.key}>
            <button
              type="button"
              onClick={() => onPick(choice.key)}
              className="inline-flex h-11 items-center rounded-full button-glass px-4 type-label font-semibold"
            >
              {choice.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
