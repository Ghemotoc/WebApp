/**
 * LandingBlockView: one block of a landing page, as visitors see it (story S1-E11-14; bundle
 * CONTESTS-13a1).
 *
 * Every block is real HTML text with one heading level: the hero is the page's h1 and every other
 * block an h2 (criterion 4, one heading order). Long text is the CMS's safe Markdown subset
 * (CmsMarkdown: no raw HTML, links get rel="nofollow ugc noopener"). No countdowns and no "only
 * today": copy aimed at minors must not pressure them (story legal notes).
 * Part a2a: a Text block may carry a picture (LandingPicture), and Featured stories draws a
 * shelf of story cards (FeaturedStoriesBlock). Part a2b: Remind me (RemindMeBlock). The page
 * builder's blocks (S1-E11-34) are drawn by BuilderBlocks.
 * Who shows it: LandingPageView. What it calls: CmsMarkdown and the shared formatters.
 */
import { CmsMarkdown } from '@/features/website/components/CmsMarkdown';
import { formatCalendarDate } from '@/lib/local-time';
import type { LandingBlock, LandingLanguage } from '@/schemas/landingPages';
import { safeLandingLink } from '@/schemas/landingPages';

import type { LandingExtras } from '../api/landingPages';
import { wordsOf } from '../lib/blocks';
import { isBuilderKind } from '../lib/builderKinds';
import { useLandingPageTranslation } from '../registerLandingPageTranslations';

import { BuilderBlockView } from './BuilderBlocks';
import { FeaturedStoriesBlock } from './FeaturedStoriesBlock';
import { LandingPicture } from './LandingPicture';
import { RemindMeBlock } from './RemindMeBlock';

/** What a block needs: the block and the language the visitor reads. */
interface BlockProps {
  block: LandingBlock;
  language: LandingLanguage;
}

/** What the block view needs: also the page's pictures and story cards, and whether it is the
 * editor's preview. */
interface LandingBlockViewProps extends BlockProps {
  extras: LandingExtras;
  isPreview?: boolean;
}

/**
 * A block's heading and its Markdown text.
 *
 * @returns the section
 */
function TextSection({ block, language, extras, isPreview }: LandingBlockViewProps) {
  const body = wordsOf(block, language, 'body');
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading type-heading font-bold text-ink-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      <LandingPicture
        block={block}
        language={language}
        pictures={extras.pictures}
        isPreview={isPreview}
      />
      {body !== '' && <CmsMarkdown markdown={body} language={language} />}
    </section>
  );
}

/**
 * The three key dates, in a list of labels and values.
 *
 * @returns the section
 */
function KeyDates({ block, language }: BlockProps) {
  const { t } = useLandingPageTranslation();
  const dates = block.dates ?? { entries_open: '', entries_close: '', results: '' };
  const note = wordsOf(block, language, 'note');
  const rows = [
    { label: t('dates.entriesOpen'), value: dates.entries_open },
    { label: t('dates.entriesClose'), value: dates.entries_close },
    { label: t('dates.results'), value: dates.results },
  ];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading type-heading font-bold text-ink-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      {/* Label and value rows with a fine line between them (definition of done, design rules). */}
      <dl className="m-0 flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex flex-wrap justify-between gap-2 border-b border-hairline py-2"
          >
            <dt className="text-ink-muted">{row.label}</dt>
            <dd className="m-0 font-semibold text-ink">
              {row.value === '' ? '' : formatCalendarDate(row.value, language)}
            </dd>
          </div>
        ))}
      </dl>
      {note !== '' && <p className="m-0 text-ink-muted">{note}</p>}
    </section>
  );
}

/**
 * Who can enter: the age groups and the words.
 *
 * @returns the section
 */
function WhoCanEnter({ block, language }: BlockProps) {
  const { t } = useLandingPageTranslation();
  const groups = block.age_groups ?? [];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading type-heading font-bold text-ink-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={t('ageGroupsLabel')}>
        {groups.map((group) => (
          <li
            key={group}
            className="inline-flex h-6 items-center rounded-full border border-(--pill-sage-border) bg-(--pill-sage-bg) px-3 type-body leading-none text-(--pill-sage-text)"
          >
            {t(`ageGroups.${group}`)}
          </li>
        ))}
      </ul>
      <CmsMarkdown markdown={wordsOf(block, language, 'body')} language={language} />
    </section>
  );
}

/**
 * The rules: a short summary and the link to the full rules.
 *
 * @returns the section
 */
function Rules({ block, language }: BlockProps) {
  const body = wordsOf(block, language, 'body');
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 font-heading type-heading font-bold text-ink-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      {body !== '' && <CmsMarkdown markdown={body} language={language} />}
      <a
        href={safeLandingLink(block.link)}
        className="inline-flex min-h-11 w-fit items-center font-semibold text-link underline"
      >
        {wordsOf(block, language, 'link_label')}
      </a>
    </section>
  );
}

/**
 * Questions and answers as board A10 draws them ("Before you start"): each question in bold with
 * its answer under it, a hairline between them, all open, so a visitor reads them at a glance
 * (BOOKS-A10; replaces the closed disclosures of G5b).
 *
 * @returns the section
 */
function Questions({ block, language }: BlockProps) {
  const items = block[language].items ?? [];
  return (
    <section className="flex flex-col gap-4">
      <h2 className="m-0 font-heading type-heading font-bold text-ink-heading">
        {wordsOf(block, language, 'heading')}
      </h2>
      <dl className="m-0 flex flex-col border-t border-hairline">
        {items.map((item, position) => (
          <div
            key={`${String(position)}-${item.question}`}
            className="flex flex-col gap-1 border-b border-hairline py-4 last:border-b-0"
          >
            <dt className="type-label font-semibold text-ink-heading">{item.question}</dt>
            <dd className="m-0 text-ink-muted">
              <CmsMarkdown markdown={item.answer} language={language} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Draws the blocks that need data beyond their own words: featured stories and the reminder
 * sign-up. Anything else is a heading and Markdown text (text, prize and how to enter, and a text
 * block's picture too).
 *
 * @returns the block
 */
function ExtrasOrTextBlock(props: LandingBlockViewProps) {
  const { block, language, extras } = props;
  if (block.kind === 'featured') {
    const stories = extras.featured === null ? null : (extras.featured[block.id] ?? []);
    return <FeaturedStoriesBlock block={block} language={language} stories={stories} />;
  }
  if (block.kind === 'remind_me') {
    return <RemindMeBlock block={block} language={language} reminder={extras.reminder} />;
  }
  return <TextSection {...props} />;
}

/**
 * Renders one block by its kind. The hero is drawn by LandingPageView, around the page title.
 *
 * @returns the block, or nothing for the hero
 */
export function LandingBlockView(props: LandingBlockViewProps) {
  const { block, language } = props;
  if (block.kind === 'key_dates') return <KeyDates block={block} language={language} />;
  if (block.kind === 'who_can_enter') return <WhoCanEnter block={block} language={language} />;
  if (block.kind === 'rules') return <Rules block={block} language={language} />;
  if (block.kind === 'questions') return <Questions block={block} language={language} />;
  if (block.kind === 'hero') return null;
  // The page builder's blocks (S1-E11-34) live in BuilderBlocks.tsx.
  if (isBuilderKind(block.kind)) return <BuilderBlockView {...props} />;
  return <ExtrasOrTextBlock {...props} />;
}
