/**
 * useAvatarDraft: the avatar being built in Settings, with undo (bundle ADMIN-2, part g; brief
 * section 7: "a live preview, 'Surprise me' and undo").
 *
 * Every change (one part, or a whole surprise) can be undone, one step at a time, back to where
 * the builder started. Nothing is saved until the person presses Save.
 * Who calls it: AvatarBuilderSection. What it calls: lib/randomRecipe.ts.
 */
import { useState } from 'react';

import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import type { AvatarPart } from '../lib/avatarOptions';
import { randomRecipe } from '../lib/randomRecipe';

/**
 * Keeps the draft and its earlier versions.
 *
 * @param startFrom - the saved recipe, or the starting one when there is none
 * @returns the draft and the ways to change it
 */
export function useAvatarDraft(startFrom: AvatarRecipe) {
  const [draft, setDraft] = useState<AvatarRecipe>(startFrom);
  const [earlier, setEarlier] = useState<AvatarRecipe[]>([]);

  /** Replaces the draft and remembers the one before, for Undo. */
  function change(next: AvatarRecipe) {
    setEarlier((list) => [...list, draft]);
    setDraft(next);
  }

  /** Goes back one step, when there is one. */
  function undo() {
    const previous = earlier.at(-1);
    if (previous === undefined) return;
    setEarlier((list) => list.slice(0, -1));
    setDraft(previous);
  }

  return {
    draft,
    canUndo: earlier.length > 0,
    choose: (part: AvatarPart, value: string) => change({ ...draft, [part]: value }),
    surprise: () => change(randomRecipe()),
    undo,
    // A fresh start from a recipe (after loading the saved one), with nothing to undo.
    reset: (recipe: AvatarRecipe) => {
      setEarlier([]);
      setDraft(recipe);
    },
  };
}
