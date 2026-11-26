/**
 * MarketingFields: the writer's own notes on the Marketing page (story S1-E17-29: "one place for
 * my back-cover blurb, comparable titles, hooks and keywords, query pitch and launch notes";
 * "when I edit any field, then it saves by itself"; redrawn by user stories bundle 6, story 6.13,
 * board E32: "The pitch and Getting it out are private notes that save by themselves; the logline
 * and route are shared with At a glance, and the genre and audience come from the story").
 *
 * Two sections between hairlines, as board E32 draws them. "The pitch": a line saying where the
 * logline, route, genre and audience are written (At a glance and the story, so they are not
 * repeated here), then the blurb, comparable titles (one line), hooks and keywords (one line) and
 * the query pitch. "Getting it out": the launch notes, then the writer's own details and "Add
 * detail" (GAPS-2b; the board doesn't draw them, docs/board-fixes.md).
 * Who uses it: MarketingPage. What it calls: the saveNote prop (useStoryMarketing),
 * MarketingSection and MarketingDetails.
 */
import type { MarketingNotes } from '../api/marketing';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { MarketingDetails } from './MarketingDetails';
import { MarketingSection } from './MarketingSection';
import { PlanTextField } from './PlanTextField';

/** What the fields need. */
export interface MarketingFieldsProps {
  slug: string;
  notes: MarketingNotes;
  saveNote: (field: keyof MarketingNotes, value: string) => Promise<void>;
}

/** Each marketing note's longest length, as the database allows (…_s1_e17_27_…sql). */
const noteLengths: Record<keyof MarketingNotes, number> = {
  back_cover_blurb: 3000,
  comparable_titles: 1000,
  hooks_keywords: 1000,
  query_pitch: 3000,
  launch_notes: 5000,
};

/** The notes board E32 draws as one-line boxes; the rest are three lines tall and grow. */
const oneLineNotes: ReadonlyArray<keyof MarketingNotes> = ['comparable_titles', 'hooks_keywords'];

/** One marketing note's box, labelled and hinted from the locale files. */
function NoteField({
  field,
  notes,
  saveNote,
}: {
  field: keyof MarketingNotes;
  notes: MarketingNotes;
  saveNote: MarketingFieldsProps['saveNote'];
}) {
  const { t } = useAtlasTranslation();
  return (
    <PlanTextField
      id={`atlas-marketing-${field}`}
      label={t(`marketing.fields.${field}`)}
      hint={t(`marketing.hints.${field}`)}
      isMultiline={!oneLineNotes.includes(field)}
      maxLength={noteLengths[field]}
      savedValue={notes[field]}
      save={async (value) => saveNote(field, value)}
    />
  );
}

/**
 * Renders the two sections.
 *
 * @returns "The pitch" and "Getting it out"
 */
export function MarketingFields({ slug, notes, saveNote }: MarketingFieldsProps) {
  const { t } = useAtlasTranslation();
  return (
    <>
      <MarketingSection id="atlas-marketing-pitch-heading" heading={t('marketing.pitchHeading')}>
        <p className="m-0 type-meta text-ink-muted">{t('marketing.sharedHint')}</p>
        <NoteField field="back_cover_blurb" notes={notes} saveNote={saveNote} />
        <NoteField field="comparable_titles" notes={notes} saveNote={saveNote} />
        <NoteField field="hooks_keywords" notes={notes} saveNote={saveNote} />
        <NoteField field="query_pitch" notes={notes} saveNote={saveNote} />
      </MarketingSection>
      <MarketingSection id="atlas-marketing-launch-heading" heading={t('marketing.launchHeading')}>
        <NoteField field="launch_notes" notes={notes} saveNote={saveNote} />
        <MarketingDetails slug={slug} />
      </MarketingSection>
    </>
  );
}
