/**
 * BibleSectionsManager: "Manage sections" on the bible page (story S1-E17-17).
 *
 * Every section as a row (rename, drag or Up and Down, Delete when empty), then "Add a section".
 * A failed move says so plainly. Who uses it: BiblePage, when no entry is open. What it calls:
 * useStoryBible's section changers, passed in.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { StoryBible } from '../api/bible';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { BibleSectionRow } from './BibleSectionRow';

/** What the manager needs. */
export interface BibleSectionsManagerProps {
  bible: StoryBible;
  addSection: (name: string) => Promise<unknown>;
  renameSection: (sectionId: string, name: string) => Promise<void>;
  moveSection: (sectionId: string, newPosition: number) => Promise<void>;
  removeSection: (sectionId: string) => Promise<'ok' | 'not_empty'>;
}

/** "Add a section": a name and the button, with a plain message when it can't. */
function AddSectionForm({ addSection }: Pick<BibleSectionsManagerProps, 'addSection'>) {
  const { t } = useAtlasTranslation();
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  /** Adds the typed section, or says why not. */
  async function add() {
    setMessage(null);
    if (name.trim() === '') return setMessage(t('bible.sections.nameRequired'));
    await addSection(name)
      .then(() => setName(''))
      .catch(() => setMessage(t('bible.sections.addFailed')));
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <h3 className="m-0 font-heading text-lg font-bold text-heading">
        {t('bible.sections.addHeading')}
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <TextInput
            id="atlas-bible-new-section"
            label={t('bible.sections.addName')}
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          {t('bible.sections.add')}
        </Button>
      </div>
      <div aria-live="polite">{message !== null && <Notice tone="error">{message}</Notice>}</div>
    </form>
  );
}

/**
 * Renders the manager.
 *
 * @returns the card with the section rows and the add form
 */
export function BibleSectionsManager(props: BibleSectionsManagerProps) {
  const { t } = useAtlasTranslation();
  const { bible } = props;
  const [moveFailed, setMoveFailed] = useState(false);

  /** Moves a section to a place, or says plainly that it couldn't. */
  function move(sectionId: string, position: number) {
    setMoveFailed(false);
    void props.moveSection(sectionId, position).catch(() => setMoveFailed(true));
  }

  return (
    <section
      aria-labelledby="atlas-bible-sections-heading"
      className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface px-7 py-[26px] shadow-card"
    >
      <h2
        id="atlas-bible-sections-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('bible.sections.heading')}
      </h2>
      <p className="m-0 text-sm text-meta">{t('bible.sections.hint')}</p>
      <div aria-live="polite">
        {moveFailed && <Notice tone="error">{t('bible.sections.moveFailed')}</Notice>}
      </div>
      <ol className="m-0 list-none p-0">
        {bible.sections.map((section, index) => (
          <BibleSectionRow
            key={section.id}
            section={section}
            entryCount={bible.entries.filter((entry) => entry.sectionId === section.id).length}
            isFirst={index === 0}
            isLast={index === bible.sections.length - 1}
            rename={async (name) => props.renameSection(section.id, name)}
            moveTo={(position) => move(section.id, position)}
            takeDrop={(draggedId) => move(draggedId, section.position)}
            remove={async () => props.removeSection(section.id)}
          />
        ))}
      </ol>
      <AddSectionForm addSection={props.addSection} />
    </section>
  );
}
