/**
 * CaseEmbedPanel: the music or video card an embed case is about (story S1-E3-10 criterion 4).
 *
 * It shows the service, the title, the channel or artist, the chapter it sits in and the writer's
 * link. The player is never loaded on this page: the moderator opens the link in a new tab when
 * they choose (no cookies from the service on staff screens otherwise). The decision is the usual
 * one: removing the item takes away this one card and leaves the chapter up.
 * Plain components, no doodles (DoD).
 * Who shows it: CasePage, when the case is about a card. What it calls: useCaseEmbed.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { LabelRows } from '@/components/ui/LabelRows';
import { EMBED_SERVICE_NAMES } from '@/lib/embed-links';

import { useCaseEmbed } from '../hooks/useCaseEmbed';

/**
 * Renders the panel.
 *
 * @param props.caseId - the case's ID
 * @returns the panel, or null while loading or when the case isn't about a card
 */
export function CaseEmbedPanel({ caseId }: { caseId: string }) {
  const { t } = useTranslation('moderation');
  const card = useCaseEmbed(caseId).data;
  if (card === undefined || card === null) return null;
  return (
    <section
      aria-labelledby="case-embed-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="case-embed-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('embed.heading')}
      </h2>
      <LabelRows
        rows={[
          { label: t('embed.service'), value: EMBED_SERVICE_NAMES[card.service] },
          { label: t('embed.title'), value: card.title ?? t('embed.noTitle') },
          { label: t('embed.author'), value: card.authorName ?? t('embed.noTitle') },
          {
            label: t('embed.chapter'),
            value: (
              <Link
                to={`/s/${card.story.slug}/${card.chapterCode}`}
                className="text-link underline"
              >
                {card.story.title}
              </Link>
            ),
          },
          {
            label: t('embed.link'),
            value: (
              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="break-all text-link underline"
              >
                {card.sourceUrl}
              </a>
            ),
          },
        ]}
      />
      <p className="m-0 text-[13px] text-meta">{t('embed.decisionHint')}</p>
    </section>
  );
}
