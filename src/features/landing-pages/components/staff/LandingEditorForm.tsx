/**
 * LandingEditorForm: the page being edited, held in the browser until Save draft or Publish: its
 * theme, its blocks, the preview and the publish bar (story S1-E11-14 criteria 2 to 4 and 9;
 * bundle CONTESTS-13a1).
 *
 * Since bundle G12c (the canvas's StaffWebsiteLandingEdit board) the blocks are a list on one side
 * and the one open block's fields on the other, so a long page never turns into one tall form.
 * The hero is open first; adding a block opens it, and removing the open block opens the one
 * before it. The theme is a row of chips, as the board draws it.
 *
 * The form starts from the version it is given and keeps its own copy; LandingPageEditor gives it
 * a new key when another version becomes the draft (after Restore), so it starts again from that.
 * Who shows it: LandingPageEditor. What it calls: the block helpers in lib/blocks.ts,
 * BlockListRow, BlockCard, AddBlockRow, LandingPreview and LandingPublishBar.
 */
import { useState } from 'react';

import { ChoiceChips } from '@/components/ui/ChoiceChips';
import type { FieldProblem } from '@/features/website/api/websiteContentStore';
import { landingThemes, type LandingContent } from '@/schemas/landingPages';

import type { LandingDraftInput } from '../../api/landingPages';
import type { LandingEditorState } from '../../hooks/useLandingPageEditor';
import { useLandingPictureStates } from '../../hooks/useLandingPictures';
import { addBlock, moveBlock, removeBlock, updateBlock } from '../../lib/blocks';
import { problemFor } from '../../lib/problemLabels';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

import { AddBlockRow } from './AddBlockRow';
import { BlockCard } from './BlockCard';
import { BlockListRow } from './BlockListRow';
import { LandingPreview } from './LandingPreview';
import { LandingPublishBar } from './LandingPublishBar';

/** The id of the one editor panel, which every Edit button points at. */
const editorId = 'landing-block-editor';

/** What the form needs. */
interface LandingEditorFormProps {
  /** The version to start from: the draft, or the newest published version. */
  initial: LandingDraftInput;
  pageType: string;
  today: string;
  state: LandingEditorState;
}

/**
 * True when the server asked for a fix somewhere inside the block at this position.
 *
 * @param problems - the fields the server refused
 * @param index - the block's position
 * @returns whether the block's row should say "Needs a fix"
 */
function blockNeedsFix(problems: readonly FieldProblem[], index: number): boolean {
  const prefix = `blocks.${String(index)}`;
  return problems.some(
    (problem) => problem.field === prefix || problem.field.startsWith(`${prefix}.`),
  );
}

/** What the list of blocks needs. */
interface BlockListProps {
  content: LandingContent;
  openIndex: number;
  problems: readonly FieldProblem[];
  onOpen: (index: number) => void;
  onContentChange: (content: LandingContent, openIndex: number) => void;
}

/**
 * The list of blocks with Edit, Up, Down and Remove on each, and "Add a block" below it.
 *
 * @returns the list card
 */
function BlockList({ content, openIndex, problems, onOpen, onContentChange }: BlockListProps) {
  const { t } = useLandingPageTranslation();
  /** Moves a block, and keeps the open block open wherever it lands. */
  const move = (index: number, direction: -1 | 1) => {
    const moved = moveBlock(content, index, direction);
    const openId = content.blocks[openIndex]?.id;
    onContentChange(
      moved,
      Math.max(
        0,
        moved.blocks.findIndex((block) => block.id === openId),
      ),
    );
  };
  /** Removes a block; when it was the open one, the block before it opens. */
  const remove = (index: number) => {
    const openId = content.blocks[openIndex]?.id;
    const removed = removeBlock(content, index);
    const stillOpen = removed.blocks.findIndex((block) => block.id === openId);
    onContentChange(removed, stillOpen === -1 ? Math.max(0, index - 1) : stillOpen);
  };
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <h2 className="m-0 font-heading text-lg font-bold text-heading">{t('editor.blocks')}</h2>
      <ol aria-label={t('editor.blocks')} className="m-0 flex list-none flex-col p-0">
        {content.blocks.map((block, index) => (
          <BlockListRow
            key={block.id}
            content={content}
            index={index}
            isOpen={index === openIndex}
            needsFix={blockNeedsFix(problems, index)}
            editorId={editorId}
            onOpen={() => onOpen(index)}
            onMove={(direction) => move(index, direction)}
            onRemove={() => remove(index)}
          />
        ))}
      </ol>
      <p className="m-0 text-sm text-meta">{t('editor.blocksHint')}</p>
      <AddBlockRow
        content={content}
        onAdd={(block) =>
          // A new block opens straight away: a hero goes to the top, anything else to the end.
          onContentChange(
            addBlock(content, block),
            block.kind === 'hero' ? 0 : content.blocks.length,
          )
        }
      />
    </div>
  );
}

/**
 * The page's theme, as a row of chips (the board draws chips, not a drop-down).
 *
 * @returns the chip group
 */
function ThemeChips({
  content,
  onChange,
}: {
  content: LandingContent;
  onChange: (theme: LandingContent['theme']) => void;
}) {
  const { t } = useLandingPageTranslation();
  return (
    <ChoiceChips
      label={t('editor.theme')}
      isLabelVisible
      isLabelEyebrow
      value={content.theme}
      onChange={(value) => onChange(landingThemes.find((theme) => theme === value) ?? 'plum')}
      options={landingThemes.map((theme) => ({ value: theme, label: t(`editor.themes.${theme}`) }))}
    />
  );
}

/**
 * Renders the form.
 *
 * @returns the editing area
 */
export function LandingEditorForm({ initial, pageType, today, state }: LandingEditorFormProps) {
  const { t } = useLandingPageTranslation();
  const [draft, setDraft] = useState<LandingDraftInput>(initial);
  // Step 1: which block is open, by position; the hero (position 0) is open first.
  const [openIndex, setOpenIndex] = useState(0);
  const problems = state.failure?.problems ?? [];
  // Part a2a: the page's pictures and their check states, for the fields and the preview.
  const pictures = useLandingPictureStates(draft.pageId).data ?? {};
  /** Replaces the content, keeping the dates. */
  const setContent = (content: LandingContent) => setDraft((current) => ({ ...current, content }));
  const pageProblem = problemFor(problems, 'blocks');
  const safeOpenIndex = Math.min(openIndex, draft.content.blocks.length - 1);
  return (
    <div className="flex flex-col gap-6">
      <ThemeChips
        content={draft.content}
        onChange={(theme) => setContent({ ...draft.content, theme })}
      />
      {pageProblem !== null && (
        <p className="m-0 text-sm text-destructive">{t(`editor.problems.${pageProblem}`)}</p>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <BlockList
          content={draft.content}
          openIndex={safeOpenIndex}
          problems={problems}
          onOpen={setOpenIndex}
          onContentChange={(content, nextOpen) => {
            setContent(content);
            setOpenIndex(nextOpen);
          }}
        />
        <BlockCard
          key={draft.content.blocks[safeOpenIndex]?.id}
          pageId={draft.pageId}
          editorId={editorId}
          pictures={pictures}
          content={draft.content}
          index={safeOpenIndex}
          problems={problems}
          onChange={(changed) =>
            setContent(updateBlock(draft.content, safeOpenIndex, () => changed))
          }
          onNext={() => setOpenIndex(safeOpenIndex + 1)}
        />
      </div>
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
