/**
 * HeroPreview: a live preview of the home page hero as the admin types (story S1-E11-06
 * criterion 4: "the hero text in the website's fonts and colours, text only").
 *
 * It uses the same HeadlineLines as the page, so the two colours land as they will on the
 * website. It isn't a heading, so the staff page keeps its own outline; the buttons are shown as
 * text, not links. Who uses it: HomePageEditor.
 */
import { useTranslation } from 'react-i18next';

import type { HomePageContent } from '@/schemas/websiteContent';

import { withBrand } from '../../lib/brandText';
import { HeadlineLines } from '../HeadlineLines';

/** What the preview needs. */
interface HeroPreviewProps {
  page: HomePageContent;
  language: string;
}

/**
 * Renders the preview.
 *
 * @returns the preview panel
 */
export function HeroPreview({ page, language }: HeroPreviewProps) {
  const { t } = useTranslation('websiteAdmin');
  return (
    <figure className="m-0 flex flex-col gap-2">
      <figcaption className="text-sm font-semibold text-ink">{t('home.preview')}</figcaption>
      <div
        lang={language}
        className="flex flex-col gap-4 rounded-3xl border border-border bg-paper p-6"
      >
        <p className="m-0 eyebrow">{withBrand(page.eyebrow)}</p>
        <p className="m-0 font-heading text-[clamp(32px,4vw,52px)] leading-[0.94] font-extrabold tracking-[-0.025em] break-words text-heading">
          <HeadlineLines
            first={withBrand(page.headlineFirst)}
            second={withBrand(page.headlineSecond)}
          />
        </p>
        <p className="m-0 text-[17px] leading-[1.6] text-body">{withBrand(page.lede)}</p>
        <p className="m-0 flex flex-wrap gap-2 text-sm font-semibold">
          <span className="rounded-full bg-primary px-4 py-2 text-on-primary">
            {withBrand(page.primaryButton)}
          </span>
          <span className="rounded-full border border-control-border px-4 py-2 text-heading">
            {withBrand(page.secondaryButton)}
          </span>
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-sm text-ink">
          {page.points.map((point, index) => (
            <li key={String(index)}>{withBrand(point)}</li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
