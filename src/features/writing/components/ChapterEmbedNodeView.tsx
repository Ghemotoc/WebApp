/**
 * ChapterEmbedNodeView: a music or video card inside the chapter editor (story S1-E3-10; board
 * 4.3, the "Video from YouTube" card).
 *
 * Board values: a white card with a 1 px border and 16 px corners; on the left a dark panel with
 * a play mark (decorative here: nothing plays in the editor); on the right the eyebrow
 * ("Video · YouTube"), the title, "Readers see this card. The video plays from YouTube, which may
 * use cookies.", "Nothing loads from YouTube until the reader presses play.", "Change link"
 * (bundle GAPS-8: our server looks the new link up, as for a new card) and Remove.
 * Who uses it: the chapterEmbed node (lib/chapterEmbedNode.ts) through TipTap's React node views.
 * What it calls: useMyEmbeds (the card's service and title), EmbedLinkChange and
 * useEditingChapterId (the chapter a new card belongs to).
 */
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { InfoPill } from '@/components/ui/InfoPill';
import type { EmbedView } from '@/features/embeds/api/embeds';
import { useMyEmbeds } from '@/features/embeds/hooks/useEmbeds';
import { EMBED_SERVICE_NAMES, embedKindOf } from '@/lib/embed-links';

import { useEditingChapterId } from '../lib/editingChapter';

import { EmbedLinkChange } from './EmbedLinkChange';

/** The card's words, once its service is known. */
function CardDetails({ view, title }: { view: EmbedView | undefined; title: string }) {
  const { t } = useTranslation('editor');
  if (view === undefined) return <p className="m-0 text-sm text-meta">{t('embed.loading')}</p>;
  if (view.state === 'removed') {
    return (
      <div className="flex flex-col items-start gap-2">
        <InfoPill tone="blush">{t('embed.removed')}</InfoPill>
        <p className="m-0 text-sm text-body">{t('embed.removedNote')}</p>
      </div>
    );
  }
  const service = EMBED_SERVICE_NAMES[view.service];
  const kind = embedKindOf(view.service);
  return (
    <>
      <p className="m-0 eyebrow">{t(`embed.eyebrow.${kind}`, { service })}</p>
      <p className="m-0 font-heading text-xl leading-tight font-bold text-ink">
        {view.title ?? (title === '' ? service : title)}
      </p>
      <p className="m-0 text-sm text-body">{t(`embed.readersSee.${kind}`, { service })}</p>
      <p className="m-0 text-[13px] text-meta">{t('embed.nothingLoads', { service })}</p>
    </>
  );
}

/**
 * Renders the card block.
 *
 * @returns the card, which the writer can't type into (only its buttons and the link field take
 *   input)
 */
export function ChapterEmbedNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { t } = useTranslation('editor');
  const embedId = String(node.attrs.embedId ?? '');
  const title = String(node.attrs.title ?? '');
  const chapterId = useEditingChapterId();
  const { embeds, loadFailed } = useMyEmbeds([embedId]);
  const view = embeds[embedId];
  const kind = view?.state === 'visible' ? embedKindOf(view.service) : 'video';
  return (
    <NodeViewWrapper
      contentEditable={false}
      role="group"
      aria-label={t('embed.label')}
      className="my-7 flex flex-wrap overflow-hidden rounded-[16px] border border-border bg-surface text-[15px] leading-normal"
    >
      <div
        aria-hidden="true"
        className="flex min-h-40 flex-[1_1_220px] items-center justify-center bg-primary"
      >
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-on-primary text-primary">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </div>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1.5 px-5 py-4">
        <CardDetails view={view} title={title} />
        {loadFailed && <p className="m-0 text-sm text-destructive">{t('embed.notLoaded')}</p>}
        {chapterId !== null && (
          <div className="mt-1">
            <EmbedLinkChange
              chapterId={chapterId}
              embedId={embedId}
              kind={kind}
              onChanged={(card) => updateAttributes(card)}
            />
          </div>
        )}
        <div className="mt-1">
          <Button variant="destructive" onClick={() => deleteNode()}>
            {t(`embed.remove.${kind}`)}
          </Button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
