/**
 * useSpaceNameCheck: "This name is available." under the create form's name field (bundle
 * FORUMS-2, part a; story S1-E8-06; board 5.3).
 *
 * Who calls it: SpaceNameField. What it calls: ../api/spaces.ts checkSpaceName() →
 * space_name_available(). It waits until the person stops typing for a moment, so it doesn't ask
 * the database on every key. The server checks the name again when the space is saved.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { checkSpaceName } from '../api/spaces';

import { spacesQueryKey } from './useSpaces';

/** How long typing must pause before the name is checked, in milliseconds. */
const pauseBeforeCheck = 400;

/**
 * Checks a name once typing pauses.
 *
 * @param name - the name as typed
 * @param ownName - the space's current name when editing (it is not "taken" by itself), or null
 * @returns 'unchecked' (nothing typed, or the space's own name), 'checking', 'available', or the problem
 */
export function useSpaceNameCheck(name: string, ownName: string | null) {
  // Step 1: the name typing last paused on.
  const [settledName, setSettledName] = useState(name);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledName(name), pauseBeforeCheck);
    return () => window.clearTimeout(timer);
  }, [name]);
  // Step 2: ask about it, unless it is empty or the space's own name.
  const trimmed = settledName.trim();
  const shouldCheck = trimmed !== '' && trimmed !== ownName;
  const check = useQuery({
    queryKey: [...spacesQueryKey, 'name-check', trimmed],
    queryFn: async () => checkSpaceName(await requireClient(), trimmed),
    enabled: shouldCheck,
  });
  // Step 3: what the field should say.
  if (!shouldCheck) return { state: 'unchecked' as const, problem: null };
  if (check.isPending || settledName !== name) return { state: 'checking' as const, problem: null };
  if (check.data === null) return { state: 'available' as const, problem: null };
  return { state: 'problem' as const, problem: check.data ?? null };
}
