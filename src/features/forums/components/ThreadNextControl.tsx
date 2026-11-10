/**
 * ThreadNextControl: a moderator points a locked thread at the thread that carries on (bundle
 * GAPS-9; story S1-E8-05; design/boards/Thread.dc.html: "Go to the October prompt").
 *
 * Shown inside the moderator tools once a thread is locked. The moderator types the other
 * thread's number or pastes its address, and "Point to that thread" saves it with the reason
 * written above; "Remove pointer" takes it away. Readers then see "Go to …" on the locked note
 * (LockedThreadNote). Staff tools use plain components (CLAUDE.md, Designs).
 * Who uses it: ThreadModeration, which owns the reason and makes the change on the server.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { ThreadModeration } from '../api/forumModeration';
import { threadNumberFrom } from '../lib/forumAddresses';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the control needs from the moderator tools. */
export interface ThreadNextControlProps {
  /** Whether the thread points somewhere this moderator can open. */
  hasNext: boolean;
  /** No reason is written yet, or a change is being saved: the buttons wait. */
  isWaiting: boolean;
  /** Makes the change with the reason; resolves to true when the server took it. */
  onChange: (action: ThreadModeration['action'], nextThreadNumber?: number) => Promise<boolean>;
}

/**
 * Renders the field and its two buttons.
 *
 * @returns the control
 */
export function ThreadNextControl({ hasNext, isWaiting, onChange }: ThreadNextControlProps) {
  const { t } = useForumsTranslation();
  const [typed, setTyped] = useState('');
  const nextThreadNumber = threadNumberFrom(typed);

  /** Saves the pointer, and empties the field once the server took it. */
  async function point() {
    if (nextThreadNumber === null) return;
    const isSaved = await onChange('next', nextThreadNumber);
    if (isSaved) setTyped('');
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <TextInput
        id="moderation-next-thread"
        label={t('moderation.next.label')}
        hint={t('moderation.next.hint')}
        inputMode="url"
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={isWaiting || nextThreadNumber === null}
          onClick={() => void point()}
        >
          {t('moderation.next.set')}
        </Button>
        {hasNext && (
          <Button variant="secondary" disabled={isWaiting} onClick={() => void onChange('unnext')}>
            {t('moderation.next.remove')}
          </Button>
        )}
      </div>
    </div>
  );
}
