/**
 * FeaturedBand: Featured this week, the band at the top of Discover (story S1-E5-10, bundle
 * LOOK-4a; board Discover, the big slider).
 *
 * Staff pick up to five stories (Stories › Featured); the band shows the ones this reader may
 * see, one at a time, in the staff's order. With no picks the band is not drawn at all: there is
 * no automatic fallback (Robert, 6 Nov 2026: staff set it up).
 * It is an accessible carousel (WAI-ARIA carousel pattern): a labelled region, one slide at a
 * time named "2 of 3: title", dots, arrows and a pause button. It turns by itself every 7 seconds
 * but never under reduced motion, when paused, or while the focus or pointer is inside it; while
 * it turns, changes aren't announced (aria-live off), and once it stops they are (polite).
 * Who shows it: DiscoverPage. What it calls: useFeaturedStories → featured_stories_now(),
 * useFeaturedRotation, FeaturedSlide and FeaturedControls.
 */
import { useEffect, useRef } from 'react';

import { useFeaturedRotation } from '../hooks/useFeaturedRotation';
import { useFeaturedStories } from '../hooks/useFeaturedStories';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

import { FeaturedControls } from './FeaturedControls';
import { FeaturedSlide } from './FeaturedSlide';

/**
 * Renders the band, or nothing when no story is featured for this reader.
 *
 * @returns the carousel section or null
 */
export function FeaturedBand() {
  const { t } = useDiscoveryTranslation();
  const { stories } = useFeaturedStories();
  const rotation = useFeaturedRotation(stories.length);
  const bandRef = useRef<HTMLElement>(null);
  const { setIsHeld } = rotation;
  const isShown = stories.length > 0;
  // While the focus or the pointer is inside the band it holds still; focus moving between its
  // own buttons doesn't count as leaving. Listened to on the element, so the section itself stays
  // a plain region (no click or key handlers on a non-interactive element).
  useEffect(() => {
    const band = bandRef.current;
    if (!isShown || band === null) return undefined;
    const hold = () => setIsHeld(true);
    const release = () => setIsHeld(false);
    const releaseOnFocusOut = (event: FocusEvent) => {
      if (!band.contains(event.relatedTarget as Node | null)) setIsHeld(false);
    };
    band.addEventListener('focusin', hold);
    band.addEventListener('focusout', releaseOnFocusOut);
    band.addEventListener('pointerenter', hold);
    band.addEventListener('pointerleave', release);
    return () => {
      band.removeEventListener('focusin', hold);
      band.removeEventListener('focusout', releaseOnFocusOut);
      band.removeEventListener('pointerenter', hold);
      band.removeEventListener('pointerleave', release);
    };
  }, [isShown, setIsHeld]);
  const story = stories[rotation.index];
  if (story === undefined) return null;

  return (
    <section
      aria-roledescription={t('featured.carousel')}
      aria-label={t('featured.label')}
      data-testid="featured-band"
      ref={bandRef}
      className="relative overflow-hidden rounded-[28px] bg-linear-120 from-featured-from via-featured-via to-featured-to shadow-card"
    >
      {/* The focus ring turns gold on the dark card, so it stays visible there (about 9:1). */}
      <div
        aria-live={rotation.isTurning ? 'off' : 'polite'}
        className="[--focus-ring:var(--color-gold)]"
      >
        <FeaturedSlide story={story} position={rotation.index + 1} count={stories.length} />
      </div>
      {stories.length > 1 && (
        <FeaturedControls
          titles={stories.map((featured) => featured.title)}
          index={rotation.index}
          isPaused={rotation.isPaused}
          goTo={rotation.goTo}
          next={rotation.next}
          previous={rotation.previous}
          togglePause={rotation.togglePause}
        />
      )}
    </section>
  );
}
