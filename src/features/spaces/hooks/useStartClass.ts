/**
 * Starting a class and changing its school, as React hooks (bundle BOOKS-8, part 8b; boards G07
 * and G08, user stories 8.7 and 8.8).
 *
 * Who calls it: NewClassSpaceForm ("Create the class", board G07) and ClassSchoolCard (class
 * settings). What it calls: api/classTools.ts (create_class_space, set_class_school),
 * class-points' setClassPoints (set_class_points) and api/classSpaces.ts (make_class_invite).
 * After a change every forum and space read refreshes, so the class page shows it at once.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { setClassPoints } from '@/features/class-points/api/classPointsSummary';
import { forumsQueryKey } from '@/features/forums/hooks/useForumIndex';

import { makeClassInvite, type NewClassInvite } from '../api/classSpaces';
import { createClassSpace, setClassSchool, type NewClassDetails } from '../api/classTools';
import type { SpaceSettings } from '../api/spaces';

import { classToolFailureOf } from './useClassTools';
import { spaceFailureOf } from './useSpaces';

/** How long the first code works and how many it lets in (the invite card's own defaults). */
const firstInvite = { validDays: 30, admits: 40 } as const;

/** What "Create the class" sends. */
export interface StartClassRequest {
  settings: SpaceSettings;
  details: NewClassDetails;
  /** True when the teacher turned the Class points switch on in the form. */
  withPoints: boolean;
}

/** What the class page gets once the class is made. */
export interface StartedClass {
  slug: string;
  /** The first class code, shown once on the class page; null when it couldn't be made. */
  invite: NewClassInvite | null;
}

/**
 * Makes the class, turns class points on when asked, then makes the first code (user story 8.7:
 * "Creating it opens the class with the class code and an invite link to share"). A refusal on
 * the class itself stops everything; once the class exists, a failure on points or the code
 * doesn't undo it: the teacher can do both again in class settings.
 *
 * @param request - the form's settings, the grade and school, and the points switch
 * @returns the new class's address and its first code
 * @throws SpaceError when the class itself is refused
 */
async function startClass(request: StartClassRequest): Promise<StartedClass> {
  const client = await requireClient();
  // Step 1: the class, with its grade and school (create_class_space checks the badge).
  const slug = await createClassSpace(client, request.settings, request.details);
  // Step 2: class points start off (S1-E8-16 criterion 1) unless the teacher switched them on.
  if (request.withPoints) {
    await setClassPoints(client, { slug, isOn: true }).catch(() => null);
  }
  // Step 3: the first code, so the class page can show it straight away.
  const invite = await makeClassInvite(client, { slug, ...firstInvite }).catch(() => null);
  return { slug, invite };
}

/**
 * Starts a class for a teacher with the badge (board G07).
 *
 * @returns run(request) → the new class, the failure (as for any space) and isRunning
 */
export function useStartClass() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: startClass,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  return {
    run: mutation.mutateAsync,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Changes the school a class belongs to (class settings, user story 8.8).
 *
 * @param slug - the class's address
 * @returns change(school) → the saved name; the failure and isRunning
 */
export function useClassSchool(slug: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (school: string) => setClassSchool(await requireClient(), { slug, school }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  return {
    change: mutation.mutateAsync,
    failure: classToolFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
