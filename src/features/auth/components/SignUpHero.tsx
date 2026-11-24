/**
 * SignUpHero: the left half of the sign-up screen, board 2.1 (story S1-E2-01).
 *
 * Board values (board H01, the simplified design, CALM-9e): a meta line over the headline
 * "Write stories. Get read." (Q5), a lead line and four benefits. The meta line's one bold state
 * says the test is for invited writers (decided 17 Oct 2026, 12:44); it replaced the eyebrow. Each benefit has the board's icon in a glass
 * rounded square, decorative: the words say it all. G6 replaced the rotated handwritten tag with
 * an eyebrow and dropped the hand-drawn gold underline, which counted as a doodle (G4: no doodles).
 * Who uses it: SignUpPage.
 */
import { useTranslation } from 'react-i18next';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { MetaLine } from '@/components/ui/MetaLine';

/** The four benefits, in the board's order, each with the board's icon. */
const benefits = [
  { key: 'free', icon: 'book' },
  { key: 'yours', icon: 'award' },
  { key: 'noTracking', icon: 'shield' },
  { key: 'person', icon: 'flag' },
] as const;

/**
 * Renders the hero.
 *
 * @returns the hero column
 */
export function SignUpHero() {
  const { t } = useTranslation('auth');
  return (
    <div className="flex max-w-[600px] flex-col gap-4">
      <MetaLine facts={[{ text: t('signUp.hero.tagMarch'), kind: 'state' }]} />
      <h1 className="m-0 type-title lg:type-display break-words">
        {t('signUp.hero.headingStart')} {t('signUp.hero.headingEnd')}
      </h1>
      <p className="m-0 type-long leading-[1.6] text-ink-muted">{t('signUp.hero.lead')}</p>
      <ul className="m-0 mt-3 flex list-none flex-col gap-6 p-0">
        {benefits.map(({ key, icon }) => (
          <li key={key} className="flex items-start gap-4">
            {/* The board's icon in a white rounded square; decorative. */}
            <span
              aria-hidden="true"
              className="inline-flex size-12 flex-none items-center justify-center rounded-card border border-border bg-surface text-ink-heading"
            >
              <ActionIcon name={icon} size={24} className="text-ink-heading" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-heading type-subheading font-bold text-ink-heading">
                {t(`signUp.hero.benefits.${key}.title`)}
              </span>
              <span className="type-body text-ink-muted">
                {t(`signUp.hero.benefits.${key}.body`)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
