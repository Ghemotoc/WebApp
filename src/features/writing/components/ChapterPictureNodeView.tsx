/**
 * ChapterPictureNodeView: a picture inside the chapter editor (story S1-E3-09; board 4.3,
 * "Inserted picture").
 *
 * Board values: a soft paper card with a 1 px border and 16 px padding; the picture (or a quiet
 * box while it can't be shown) with its check state as a pill in the top-left corner; the alt
 * text field (required, 300 characters, its hint linked); the note on what readers see with the
 * shield icon; and "Remove picture". The board's "Replace picture" is left out: remove it and
 * insert another (docs/board-fixes.md).
 * The writer sees their own picture at every stage of its check; readers don't (S1-E10-05).
 * Who uses it: the chapterPicture node (lib/chapterPictureNode.ts) through TipTap's React node
 * views. What it calls: useMyPictureStates (the picture's state and a signed address).
 */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

import shieldIcon from '@/assets/icons/shield.svg';
import { Button } from '@/components/ui/Button';
import { InfoPill, type PillTone } from '@/components/ui/InfoPill';
import { TextInput } from '@/components/ui/TextInput';
import type { PictureState, PictureView } from '@/features/pictures/api/pictures';
import { useMyPictureStates } from '@/features/pictures/hooks/useChapterPictures';
import { MAXIMUM_ALT_TEXT_LENGTH } from '@/lib/chapter-pictures';

/** The pill's tone for each state. */
const stateTone: Record<PictureState, PillTone> = {
  checking: 'gold',
  waiting_for_person: 'gold',
  visible: 'sage',
  removed: 'blush',
};

/** The picture with its state pill, or a quiet box while there is nothing to show. */
function PictureWithState(props: {
  view: PictureView | undefined;
  alt: string;
  loadFailed: boolean;
}) {
  const { view, alt, loadFailed } = props;
  const { t } = useTranslation('editor');
  const state = view?.state ?? 'checking';
  return (
    <div className="relative overflow-hidden rounded-card bg-tint">
      {view?.url !== null && view?.url !== undefined && state !== 'removed' ? (
        <img src={view.url} alt={alt} className="block h-auto w-full" />
      ) : (
        <div className="min-h-40" />
      )}
      <span className="absolute top-3 left-3">
        <InfoPill tone={stateTone[state]}>{t(`picture.state.${state}`)}</InfoPill>
      </span>
      {loadFailed && <p className="m-0 p-3 text-sm text-destructive">{t('picture.notLoaded')}</p>}
    </div>
  );
}

/**
 * Renders the picture block.
 *
 * @returns the card, which the writer can't type into (only its field and button take input)
 */
export function ChapterPictureNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { t } = useTranslation('editor');
  const pictureId = String(node.attrs.pictureId ?? '');
  const alt = String(node.attrs.alt ?? '');
  const { pictures, loadFailed } = useMyPictureStates([pictureId]);
  const view = pictures[pictureId];
  const state = view?.state ?? 'checking';
  return (
    <NodeViewWrapper
      as="figure"
      contentEditable={false}
      aria-label={t('picture.label')}
      className="my-7 flex flex-col gap-3.5 rounded-card border border-border bg-paper p-4 text-[15px] leading-normal"
    >
      <PictureWithState view={view} alt={alt} loadFailed={loadFailed} />
      <TextInput
        id={`chapter-picture-alt-${pictureId}`}
        label={t('picture.altLabel')}
        value={alt}
        maxLength={MAXIMUM_ALT_TEXT_LENGTH}
        required
        onChange={(event) => updateAttributes({ alt: event.target.value })}
        hint={t('picture.altHint')}
        errorMessage={alt.trim() === '' ? t('picture.altMissing') : undefined}
      />
      <div className="flex items-start gap-2.5 text-sm text-heading">
        <img
          src={shieldIcon}
          alt=""
          aria-hidden="true"
          width={26}
          height={26}
          className="shrink-0"
        />
        <span>
          <strong className="font-bold">{t(`picture.noteTitle.${state}`)}</strong>{' '}
          {t(`picture.note.${state}`)}
        </span>
      </div>
      <div>
        <Button variant="destructive" onClick={() => deleteNode()}>
          {t('picture.remove')}
        </Button>
      </div>
    </NodeViewWrapper>
  );
}
