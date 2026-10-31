/**
 * BibleEntryEditor: an entry's fields in editing mode (story S1-E17-18: "entries with a title,
 * tags and free text inside each section"; "when I move it to another section, then it appears
 * there").
 *
 * Title, tags (typed with commas), section and text each save by themselves (Story Atlas
 * principle: no Save button to forget); the text box grows with the text.
 * Who uses it: BibleEntryView. What it calls: the save prop (useStoryBible's saveEntry) and
 * lib/bibleTags.ts.
 */
import type { BibleEntry, BibleEntryChange, StoryBible } from '../api/bible';
import { useBibleSectionName } from '../hooks/useBibleSectionName';
import { formatTags, parseTags } from '../lib/bibleTags';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanSelectField } from './PlanSelectField';
import { PlanTextField } from './PlanTextField';

/** What the editor needs. */
export interface BibleEntryEditorProps {
  bible: StoryBible;
  entry: BibleEntry;
  /** Saves one change; throws when it can't. */
  save: (change: BibleEntryChange) => Promise<void>;
}

/**
 * Renders the four fields.
 *
 * @returns the title, tags, section and text fields
 */
export function BibleEntryEditor({ bible, entry, save }: BibleEntryEditorProps) {
  const { t } = useAtlasTranslation();
  const sectionName = useBibleSectionName();
  const sectionOptions = bible.sections.map((section) => ({
    value: section.id,
    label: sectionName(section),
  }));
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PlanTextField
        id="atlas-bible-entry-title"
        label={t('bible.entry.title')}
        savedValue={entry.title}
        save={async (title) => save({ title })}
        isValid={(title) => title.trim() !== ''}
        maxLength={200}
      />
      <PlanTextField
        id="atlas-bible-entry-tags"
        label={t('bible.entry.tags')}
        hint={t('bible.entry.tagsHint')}
        savedValue={formatTags(entry.tags)}
        save={async (typed) => save({ tags: parseTags(typed) })}
      />
      <PlanSelectField
        id="atlas-bible-entry-section"
        label={t('bible.entry.section')}
        options={sectionOptions}
        savedValue={entry.sectionId}
        save={async (sectionId) => save({ section_id: sectionId })}
      />
      <PlanTextField
        id="atlas-bible-entry-body"
        label={t('bible.entry.body')}
        hint={t('bible.entry.bodyHint')}
        savedValue={entry.body}
        save={async (body) => save({ body })}
        isMultiline
        maxLength={100000}
      />
    </div>
  );
}
