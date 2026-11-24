/**
 * useLastAtlasSection: the Story Atlas opens the section the writer had open last for a story
 * (design books item 17, "Don't start from zero"; Tidwell's "Changes in Midstream": people come
 * back later and expect their place).
 *
 * Two jobs:
 * - useRememberAtlasSection(slug, section): every Atlas section page keeps which section is open,
 *   per story, in the account (signed in) and this browser.
 * - useResumeAtlasSection(slug): on the story's Atlas home, an address ending ?resume (from a
 *   link outside the Atlas, atlasEntryAddress) moves to that section. Without ?resume the home
 *   stays put, so "At a glance" in the menu still opens At a glance.
 * Who calls it: AtlasFrame (remember) and StoryAtlasPage (resume). What it calls:
 * useRememberedPlace, the router.
 */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

import type { Json } from '@/lib/database.types';
import { useRememberedPlace } from '@/lib/remembered/useRememberedPlace';

import {
  atlasSectionPaths,
  isAtlasSection,
  RESUME_SEARCH,
  type AtlasSection,
} from '../lib/atlasSections';

/** The section stored in a place ({ section }), or null when there is none or it is unknown. */
function sectionInPlace(place: Json | null): AtlasSection | null {
  if (place === null || typeof place !== 'object' || Array.isArray(place)) return null;
  return isAtlasSection(place.section) ? place.section : null;
}

/**
 * Keeps the open section for the story.
 *
 * @param slug - the story's address
 * @param section - the section open now, or null on a page that is not a section (search)
 */
export function useRememberAtlasSection(slug: string, section: AtlasSection | null): void {
  const { place, remember } = useRememberedPlace('atlas_section', slug === '' ? null : slug);
  const stored = sectionInPlace(place);
  useEffect(() => {
    // Only a real section, and only when it changed, so opening a page writes at most once.
    if (section === null || section === stored) return;
    remember({ section });
  }, [section, stored, remember]);
}

/**
 * Moves the Atlas home to the last section when the address asks for it (?resume).
 *
 * @param slug - the story's address
 * @returns true while it is still deciding (the page shows nothing rather than a flash)
 */
export function useResumeAtlasSection(slug: string): boolean {
  const location = useLocation();
  const navigate = useNavigate();
  const wantsResume = new URLSearchParams(location.search).has(RESUME_SEARCH);
  const { place, isSettled } = useRememberedPlace(
    'atlas_section',
    wantsResume && slug !== '' ? slug : null,
  );
  const section = sectionInPlace(place);
  useEffect(() => {
    if (!wantsResume || !isSettled) return;
    // Replace the address, so Back leaves the Atlas instead of bouncing through the home.
    const path = section === null ? '' : atlasSectionPaths[section];
    void navigate(`/plan/s/${slug}${path}`, { replace: true });
  }, [wantsResume, isSettled, section, slug, navigate]);
  return wantsResume;
}
