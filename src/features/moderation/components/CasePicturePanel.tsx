/**
 * CasePicturePanel: the picture a picture-check case is about, with what the services flagged
 * (story S1-E10-05; criterion 3: a person decides, the tools never approve or remove).
 *
 * The picture is shown blurred until the moderator chooses "Show the picture", so nobody sees
 * harmful material by accident (moderator wellbeing). For a known-abuse match the picture is never
 * shown here at all: the case is safeguarding and the evidence pack holds it (S1-E10-10).
 * The decision is the usual one: "No action" approves the picture, anything else removes it.
 * Only staff with the picture review permission see the file (bundle ADMIN-2, part e2a); others
 * read what was flagged. Plain components, no doodles (DoD).
 * Who shows it: CasePage, when the case is about a picture. What it calls: useCasePicture.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { LabelRows } from '@/components/ui/LabelRows';

import { flagLines, isKnownAbuseMatch, type CasePicture } from '../api/caseClaims';
import { useCasePicture } from '../hooks/useCaseClaim';

/**
 * The picture, blurred until asked for; nothing at all for a known-abuse match.
 *
 * @returns the picture block
 */
function PictureView({ picture, isMatch }: { picture: CasePicture; isMatch: boolean }) {
  const { t } = useTranslation('moderation');
  const [isShown, setIsShown] = useState(false);
  if (isMatch) return <p className="m-0 text-body">{t('picture.matchHidden')}</p>;
  if (!picture.canSee) return <p className="m-0 text-body">{t('picture.reviewersOnly')}</p>;
  if (picture.url === null) return <p className="m-0 text-body">{t('picture.unreadable')}</p>;
  return (
    <div className="flex flex-col items-start gap-3">
      <img
        src={picture.url}
        alt={t('picture.alt')}
        className={`max-h-[320px] max-w-full rounded-[12px] border border-border ${isShown ? '' : 'blur-xl'}`}
      />
      <Button variant="secondary" onClick={() => setIsShown(!isShown)} aria-pressed={isShown}>
        {isShown ? t('picture.hide') : t('picture.show')}
      </Button>
    </div>
  );
}

/**
 * Renders the panel.
 *
 * @param props.caseId - the case's ID
 * @returns the panel, or null while loading or when the case isn't about a picture
 */
export function CasePicturePanel({ caseId }: { caseId: string }) {
  const { t } = useTranslation('moderation');
  const picture = useCasePicture(caseId, true).data;
  if (picture === undefined || picture === null) return null;
  // A match is never shown, whatever the case says; a safeguarding case without one is.
  const isMatch = isKnownAbuseMatch(picture.flags);
  const flags = flagLines(picture.flags);
  return (
    <section
      aria-labelledby="case-picture-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5"
    >
      <h2 id="case-picture-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('picture.heading')}
      </h2>
      <PictureView picture={picture} isMatch={isMatch} />
      <LabelRows
        rows={[
          {
            label: t('picture.kind'),
            value: t(`picture.kinds.${picture.kind}`, { defaultValue: picture.kind }),
          },
          {
            label: t('picture.status'),
            value: t(`picture.statuses.${picture.status}`, { defaultValue: picture.status }),
          },
          {
            label: t('picture.flags'),
            value: flags.length === 0 ? t('picture.noFlags') : flags.join(', '),
          },
          { label: t('picture.provider'), value: picture.provider ?? t('picture.noProvider') },
          ...(picture.story === null
            ? []
            : [
                {
                  label: t('picture.story'),
                  value: (
                    <Link to={`/s/${picture.story.slug}`} className="text-link underline">
                      {picture.story.title}
                    </Link>
                  ),
                },
              ]),
        ]}
      />
      <p className="m-0 text-[13px] text-meta">{t('picture.decisionHint')}</p>
    </section>
  );
}
