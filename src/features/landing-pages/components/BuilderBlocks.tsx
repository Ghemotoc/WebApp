/**
 * BuilderBlocks: the page builder's five blocks as visitors see them (story S1-E11-34; bundle
 * CMS-2b): picture and text, cards, steps, a quote and a call to action. Since CALM-9 (board A10)
 * each step opens with a round icon tile and "Step 1"; since BOOKS-A10 steps sit on the page
 * with no box, and the Steps block carries the id the hero's "How it works" jumps to.
 *
 * Every block is real HTML with an h2, like the other blocks (one heading order). Long text is the
 * CMS's safe Markdown subset (CmsMarkdown); card and step words are plain text. A call to action
 * links only to one of our pages or an https address, which the database checks before publishing.
 * Who shows it: LandingBlockView. What it calls: CmsMarkdown, LandingPicture and buttonClassName.
 */
import { ActionIcon, type ActionIconName } from '@/components/icons/ActionIcon';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { CmsMarkdown } from '@/features/website/components/CmsMarkdown';
import type { LandingBlock, LandingLanguage } from '@/schemas/landingPages';
import { safeLandingLink } from '@/schemas/landingPages';

import type { LandingExtras } from '../api/landingPages';
import { wordsOf } from '../lib/blocks';
import { landingBlockAnchor } from '../lib/anchors';
import { entriesOf } from '../lib/entries';

import { useLandingPageTranslation } from '../registerLandingPageTranslations';

import { LandingPicture } from './LandingPicture';

/** What a builder block needs. */
interface BuilderBlockProps {
  block: LandingBlock;
  language: LandingLanguage;
  extras: LandingExtras;
  isPreview?: boolean;
}

/**
 * A block's heading, the h2 every block but the hero uses.
 *
 * @returns the heading
 */
function BlockHeading({ block, language }: BuilderBlockProps) {
  return (
    <h2 className="m-0 font-heading type-heading font-bold text-ink-heading">
      {wordsOf(block, language, 'heading')}
    </h2>
  );
}

/**
 * Picture and text: the picture beside the words on a wide screen, above them on a phone.
 *
 * @returns the section
 */
function PictureText(props: BuilderBlockProps) {
  const { block, language } = props;
  return (
    <section className="grid items-center gap-4 md:grid-cols-2">
      <LandingPicture
        block={block}
        language={language}
        pictures={props.extras.pictures}
        isPreview={props.isPreview}
      />
      <div className="flex min-w-0 flex-col gap-3">
        <BlockHeading {...props} />
        <CmsMarkdown markdown={wordsOf(block, language, 'body')} language={language} />
      </div>
    </section>
  );
}

/** The icon each step's tile shows, in order (board A10, 23 Nov 2026): a target, a pen, a book. */
const stepIcons: readonly ActionIconName[] = ['target', 'pen', 'book'];

/**
 * The icon for one step. Steps past the third keep the book, the last of the board's three.
 *
 * @param position - the step's place, from 0
 * @returns the icon's name
 */
function stepIconFor(position: number): ActionIconName {
  return stepIcons[Math.min(position, stepIcons.length - 1)] ?? 'book';
}

/**
 * The top of one step (board A10, 23 Nov 2026): a 48 px round tile with a 24 px line icon, then
 * "Step 1". The numbers are also the list's own order, so the tile is decoration only.
 *
 * @param props.position - the step's place, from 0
 * @param props.language - the page's language, for "Step 1"
 * @returns the tile and the label
 */
function StepTop({ position, language }: { position: number; language: LandingLanguage }) {
  const { t } = useLandingPageTranslation();
  return (
    <>
      <span
        aria-hidden="true"
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-tint text-ink-heading"
      >
        <ActionIcon name={stepIconFor(position)} size={24} />
      </span>
      {/* "Step 1" in the page's language, so a Romanian page never says "Step". */}
      <span className="type-meta text-ink-muted">
        {t('steps.label', { number: position + 1, lng: language })}
      </span>
    </>
  );
}

/**
 * Cards in a row (one column on a phone), or numbered steps in order.
 *
 * @returns the section
 */
function Entries(props: BuilderBlockProps) {
  const { block, language } = props;
  const entries = entriesOf(block, language);
  // Steps have an order, so they are a numbered list; cards sit side by side. Both share the
  // row: steps three across from 1024 px, as the board draws them.
  // Board A10 draws steps on the page itself, with no box around each; cards keep their box.
  const isSteps = block.kind === 'steps';
  const ListTag = isSteps ? 'ol' : 'ul';
  const itemBox = isSteps ? '' : 'rounded-card border border-border bg-surface p-4 shadow-card';
  return (
    <section
      id={isSteps ? landingBlockAnchor(block) : undefined}
      className="flex scroll-mt-24 flex-col gap-4"
    >
      <BlockHeading {...props} />
      <ListTag className="m-0 grid list-none gap-8 p-0 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {entries.map((entry, position) => (
          <li
            key={`${String(position)}-${entry.title}`}
            className={`flex min-w-0 flex-col gap-3 ${itemBox}`}
          >
            {isSteps && <StepTop position={position} language={language} />}
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="m-0 type-subheading font-bold text-ink-heading [overflow-wrap:anywhere]">
                {entry.title}
              </h3>
              <p className="m-0 type-body text-ink-muted [overflow-wrap:anywhere]">{entry.body}</p>
            </div>
          </li>
        ))}
      </ListTag>
    </section>
  );
}

/**
 * A quote and, when given, who said it.
 *
 * @returns the figure
 */
function Quote({ block, language }: BuilderBlockProps) {
  const source = wordsOf(block, language, 'source');
  return (
    <figure className="m-0 flex flex-col gap-2 rounded-field bg-tint px-4 py-4">
      <blockquote className="m-0 font-heading type-heading leading-snug text-ink-heading">
        <p className="m-0 [overflow-wrap:anywhere]">{wordsOf(block, language, 'quote')}</p>
      </blockquote>
      {source !== '' && <figcaption className="text-ink-muted">{source}</figcaption>}
    </figure>
  );
}

/**
 * A call to action: a heading, a line of words and one button-styled link.
 *
 * @returns the section
 */
function CallToAction(props: BuilderBlockProps) {
  const { block, language } = props;
  const body = wordsOf(block, language, 'body');
  return (
    <section className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-6 shadow-card">
      <BlockHeading {...props} />
      {body !== '' && <p className="m-0 text-ink-muted">{body}</p>}
      <a href={safeLandingLink(block.link)} className={buttonClassName({ variant: 'primary' })}>
        {wordsOf(block, language, 'button_label')}
      </a>
    </section>
  );
}

/**
 * Renders one of the page builder's blocks by its kind.
 *
 * @returns the block
 */
export function BuilderBlockView(props: BuilderBlockProps) {
  if (props.block.kind === 'picture_text') return <PictureText {...props} />;
  if (props.block.kind === 'quote') return <Quote {...props} />;
  if (props.block.kind === 'call_to_action') return <CallToAction {...props} />;
  return <Entries {...props} />;
}
