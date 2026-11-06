/**
 * AvatarArtCredit: the line under the avatar editor that credits the art (bundle AVATAR-1;
 * Robert, 6 Nov 2026, 11:16 UTC: "let's credit the designer where we can and where we should").
 *
 * The Micah art is "Avatar Illustration System" by Micah Lanier, under CC BY 4.0, which asks
 * for the creator's name, the licence and a link to it (ADR 0016). DiceBear also writes the
 * same credit into every drawn avatar's SVG metadata.
 * Who shows it: AvatarBuilderSection. What it calls: nothing.
 */
import { useAvatarsTranslation } from '../registerAvatarTranslations';

/** The licence's own page, as CC BY 4.0 asks. */
const licenceAddress = 'https://creativecommons.org/licenses/by/4.0/';

/**
 * Renders the credit.
 *
 * @returns a small paragraph with the licence link
 */
export function AvatarArtCredit() {
  const { t } = useAvatarsTranslation();
  return (
    <p className="m-0 text-[13px] leading-normal text-meta">
      {t('builder.credit')}{' '}
      <a
        href={licenceAddress}
        rel="noopener noreferrer"
        target="_blank"
        className="font-semibold text-link underline underline-offset-2"
      >
        {t('builder.creditLink')}
      </a>
    </p>
  );
}
