/**
 * IdeaQuickAdd: the quick-add box on the Ideas page (story S1-E17-27: "Given the quick-add box
 * with a type (Question, Idea, To-do, Decision), when I type a line and press Enter, then the
 * item is added and the box clears").
 *
 * A glass card (board AtlasIdeas, bundle G10c3): the type as a segmented switch, one line and
 * "Add". Enter in the line sends the form, so nothing else is needed; the type stays as chosen,
 * so a run of questions needs no more clicks. An empty line waits with a plain message.
 * Who uses it: IdeasPage. What it calls: the onAdd prop
 * (useStoryIdeas' add).
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextInput } from '@/components/ui/TextInput';

import { ideaKinds, type IdeaKind } from '../api/ideas';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the box needs. */
export interface IdeaQuickAddProps {
  /** Adds the line; throws when it can't. */
  onAdd: (kind: IdeaKind, body: string) => Promise<void>;
}

/**
 * Renders the box.
 *
 * @returns the form with its type, its line and "Add"
 */
export function IdeaQuickAdd({ onAdd }: IdeaQuickAddProps) {
  const { t } = useAtlasTranslation();
  const [kind, setKind] = useState<IdeaKind>('question');
  const [line, setLine] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  /** Adds the line and clears the box, or says why not. */
  async function add() {
    setMessage(null);
    // An empty line adds nothing (the database refuses it too).
    if (line.trim() === '') return setMessage(t('ideas.add.empty'));
    await onAdd(kind, line)
      .then(() => setLine(''))
      .catch(() => setMessage(t('ideas.add.failed')));
  }

  return (
    <form
      aria-labelledby="atlas-idea-add-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-5 py-5 shadow-card md:px-7"
      onSubmit={(submitted) => {
        submitted.preventDefault();
        void add();
      }}
    >
      <h2
        id="atlas-idea-add-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('ideas.add.heading')}
      </h2>
      <SegmentedControl
        legend={t('ideas.add.kind')}
        isLegendVisible={false}
        name="atlas-idea-kind"
        options={ideaKinds.map((option) => ({ value: option, label: t(`ideas.kinds.${option}`) }))}
        value={kind}
        onChange={setKind}
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <TextInput
            id="atlas-idea-line"
            label={t('ideas.add.line')}
            hint={t('ideas.add.lineHint')}
            maxLength={1000}
            value={line}
            onChange={(changed) => setLine(changed.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          {t('ideas.add.button')}
        </Button>
      </div>
      {message !== null && <Notice tone="error">{message}</Notice>}
    </form>
  );
}
