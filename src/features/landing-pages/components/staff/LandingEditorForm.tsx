/**
 * LandingEditorForm: the page being edited, held in the browser until Save draft or Publish: its
 * theme, its blocks, the preview and the publish bar (story S1-E11-14 criteria 2 to 4 and 9;
 * bundle CONTESTS-13a1).
 *
 * The form starts from the version it is given and keeps its own copy; LandingPageEditor gives it
 * a new key when another version becomes the draft (after Restore), so it starts again from that.
 * Who shows it: LandingPageEditor. What it calls: the block helpers in lib/blocks.ts, BlockCard,
 * AddBlockRow, LandingPreview and LandingPublishBar.
 */
import { useState } from 'react';

import { Select } from '@/components/ui/Select';
import { landingThemes, type LandingContent } from '@/schemas/landingPages';

import type { LandingDraftInput } from '../../api/landingPages';
import type { LandingEditorState } from '../../hooks/useLandingPageEditor';
import { useLandingPictureStates } from '../../hooks/useLandingPictures';
import { addBlock, moveBlock, removeBlock, updateBlock } from '../../lib/blocks';
import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

import { AddBlockRow } from './AddBlockRow';
import { BlockCard } from './BlockCard';
import { LandingPreview } from './LandingPreview';
import { LandingPublishBar } from './LandingPublishBar';

/** What the form needs. */
interface LandingEditorFormProps {
  /** The version to start from: the draft, or the newest published version. */
  initial: LandingDraftInput;
  pageType: string;
  today: string;
  state: LandingEditorState;
}

/**
 * Renders the form.
 *
 * @returns the editing area
 */
export function LandingEditorForm({ initial, pageType, today, state }: LandingEditorFormProps) {
  const { t } = useLandingPageTranslation();
  const [draft, setDraft] = useState<LandingDraftInput>(initial);
  const problems = state.failure?.problems ?? [];
  // Part a2a: the page's pictures and their check states, for the fields and the preview.
  const pictures = useLandingPictureStates(draft.pageId).data ?? {};
  /** Replaces the content, keeping the dates. */
  const setContent = (content: LandingContent) => setDraft((current) => ({ ...current, content }));
  const pageProblem = problemFor(problems, 'blocks');
  return (
    <div className="flex flex-col gap-6">
      <Select
        id="landing-theme"
        label={t('editor.theme')}
        isLabelVisible
        placement="form"
        value={draft.content.theme}
        onChange={(value) =>
          setContent({
            ...draft.content,
            theme: landingThemes.find((theme) => theme === value) ?? 'plum',
          })
        }
        options={landingThemes.map((theme) => ({
          value: theme,
          label: t(`editor.themes.${theme}`),
        }))}
      />
      {pageProblem !== null && (
        <p className="m-0 text-sm text-destructive">{t(`editor.problems.${pageProblem}`)}</p>
      )}
      <ol aria-label={t('editor.blocks')} className="m-0 flex list-none flex-col gap-4 p-0">
        {draft.content.blocks.map((block, index) => (
          <BlockCard
            key={block.id}
            pageId={draft.pageId}
            pictures={pictures}
            content={draft.content}
            index={index}
            problems={problems}
            onChange={(changed) => setContent(updateBlock(draft.content, index, () => changed))}
            onMove={(direction) => setContent(moveBlock(draft.content, index, direction))}
            onRemove={() => setContent(removeBlock(draft.content, index))}
          />
        ))}
      </ol>
      <AddBlockRow
        content={draft.content}
        onAdd={(block) => setContent(addBlock(draft.content, block))}
      />
      <LandingPreview content={draft.content} pageType={pageType} pictures={pictures} />
      <LandingPublishBar
        draft={draft}
        today={today}
        state={state}
        onDatesChange={(showFrom, takeDownOn) =>
          setDraft((current) => ({ ...current, showFrom, takeDownOn }))
        }
      />
    </div>
  );
}
