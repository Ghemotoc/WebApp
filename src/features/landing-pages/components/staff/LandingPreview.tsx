/**
 * LandingPreview: the page as visitors will see it, at phone or desktop width and in Romanian or
 * English (story S1-E11-14 criterion 3; bundle CONTESTS-13a1).
 *
 * The preview draws the editor's unsaved words with the same LandingPageView the public page
 * uses, so what the admin sees is what goes live. The width and language switches are buttons
 * with aria-pressed, so their state isn't shown by colour alone.
 * Who shows it: LandingEditorForm. What it calls: LandingPageView.
 */
import { useState } from 'react';

import { Chip } from '@/components/ui/Chip';
import type { PictureView } from '@/features/pictures/api/pictures';
import {
  landingLanguages,
  type LandingContent,
  type LandingLanguage,
} from '@/schemas/landingPages';

import { useLandingPageTranslation } from '../../registerLandingPageTranslations';
import { LandingPageView } from '../LandingPageView';

/** The two preview widths: a phone (the 390 px reference width) and the full column. */
const widths = { phone: 'max-w-[390px]', desktop: 'max-w-none' } as const;
type PreviewWidth = keyof typeof widths;

/** What the preview needs. */
interface LandingPreviewProps {
  content: LandingContent;
  pageType: string;
  /** The page's pictures as the admin may see them, ready or not (part a2a). */
  pictures: Record<string, PictureView>;
}

/**
 * Renders the switches and the page.
 *
 * @returns the preview section
 */
export function LandingPreview({ content, pageType, pictures }: LandingPreviewProps) {
  const { t } = useLandingPageTranslation();
  const [width, setWidth] = useState<PreviewWidth>('desktop');
  const [language, setLanguage] = useState<LandingLanguage>('ro');
  return (
    <section aria-labelledby="landing-preview-heading" className="flex min-w-0 flex-col gap-3">
      <h3 id="landing-preview-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('editor.preview')}
      </h3>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(widths) as PreviewWidth[]).map((each) => (
          <Chip key={each} isPressed={width === each} onPressedChange={() => setWidth(each)}>
            {t(`editor.widths.${each}`)}
          </Chip>
        ))}
        {landingLanguages.map((each) => (
          <Chip key={each} isPressed={language === each} onPressedChange={() => setLanguage(each)}>
            {t(`languages.${each}`)}
          </Chip>
        ))}
      </div>
      <div
        data-testid="landing-preview"
        className={`w-full ${widths[width]} rounded-card border border-border bg-paper p-4`}
      >
        <LandingPageView
          content={content}
          language={language}
          hasEnded={false}
          pageType={pageType}
          extras={{ pictures, featured: null, reminder: null }}
          isPreview
        />
      </div>
    </section>
  );
}
