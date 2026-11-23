/**
 * SpaceBannerGuide: a small 7 to 1 picture of a space's banner with its safe middle drawn as a
 * dashed box (CALM-9, board F07, 23 Nov 2026). The middle box is the part cards and phones show,
 * so words and the main shapes belong inside it. The hint beside the field says the same in
 * words, so the picture is decoration for screen readers.
 * Who shows it: SpaceBannerChoice, under the colours. What it calls: nothing.
 */
import { useSpacesTranslation } from '../registerSpacesTranslations';

/**
 * Renders the guide.
 *
 * @returns the striped box with the labelled middle
 */
export function SpaceBannerGuide() {
  const { t } = useSpacesTranslation();
  return (
    <div
      aria-hidden="true"
      data-testid="space-banner-guide"
      className="relative aspect-[7/1] w-full max-w-[520px] rounded-field space-banner-guide"
    >
      {/* The board's safe middle: 28% in from each side and 10% from the top and bottom. */}
      <span className="absolute inset-x-[28%] inset-y-[10%] grid place-items-center rounded-field space-banner-guide-safe px-1 text-center type-kicker font-normal text-ink-muted">
        {t('form.bannerGuide')}
      </span>
    </div>
  );
}
