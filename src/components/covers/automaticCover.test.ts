/**
 * Automatic covers: the same design for a story everywhere, never two neighbours alike
 * (story S1-E3-13), and only patterned designs (LOOK-1, D3).
 */
import { describe, expect, it } from 'vitest';

import {
  automaticCoverFor,
  automaticDesignChoices,
  automaticDesignKeys,
  designsForRow,
  resolveCoverChoice,
  type CoverSource,
} from './automaticCover';
import { coverDesigns, defaultChoiceFor } from './coverDesigns';

/** A made-up but valid-looking story ID. */
function storyId(number: number): string {
  return `00000000-0000-4000-9000-${number.toString(16).padStart(12, '0')}`;
}

/** A story with an automatic cover. */
function automatic(number: number): CoverSource {
  return { id: storyId(number), coverKind: 'automatic', drawnCover: null };
}

describe('automaticCoverFor', () => {
  it('always gives the same design for the same story, whatever the title does', () => {
    expect(automaticCoverFor(storyId(7))).toEqual(automaticCoverFor(storyId(7)));
  });

  it('picks one of the 7 patterned designs, with its board colours', () => {
    const cover = automaticCoverFor(storyId(42));
    expect(automaticDesignKeys).toContain(cover.design);
    expect(cover).toEqual(defaultChoiceFor(cover.design));
  });

  it('an automatic cover never uses a flat colour, so no card looks empty (D3)', () => {
    const flatKeys = coverDesigns
      .filter((design) => design.kind === 'plain')
      .map((design) => design.key);
    expect(automaticDesignKeys).toHaveLength(7);
    for (let number = 0; number < 1000; number += 1) {
      for (const design of automaticDesignChoices(storyId(number), 3)) {
        expect(flatKeys).not.toContain(design);
      }
    }
    // A row moves a clashing card to its second choice, which is patterned too.
    const row = designsForRow(Array.from({ length: 300 }, (_, number) => automatic(number)));
    for (const cover of row) expect(flatKeys).not.toContain(cover.design);
  });

  it('spreads 1,000 stories across every patterned design, none taking more than a quarter', () => {
    const counts = new Map<string, number>();
    for (let number = 0; number < 1000; number += 1) {
      const { design } = automaticCoverFor(storyId(number));
      counts.set(design, (counts.get(design) ?? 0) + 1);
    }
    expect(counts.size).toBe(7);
    expect(Math.max(...counts.values())).toBeLessThan(250);
  });
});

describe('automaticDesignChoices', () => {
  it('never lists the same design twice in a row, so the second choice is a real alternative', () => {
    for (let number = 0; number < 200; number += 1) {
      const [first, second, third] = automaticDesignChoices(storyId(number), 3);
      expect(second).not.toBe(first);
      expect(third).not.toBe(second);
    }
  });
});

describe('resolveCoverChoice', () => {
  it('keeps the writer’s drawn choice and gives an automatic story its ID design', () => {
    const drawn = { design: 'starry', background: 'sky', accent: 'gold' } as const;
    expect(resolveCoverChoice({ id: storyId(1), coverKind: 'drawn', drawnCover: drawn })).toEqual(
      drawn,
    );
    expect(resolveCoverChoice(automatic(1))).toEqual(automaticCoverFor(storyId(1)));
  });
});

describe('designsForRow', () => {
  it('never shows the same design on two neighbouring automatic covers', () => {
    // Enough stories that some neighbours would clash by chance.
    const row = Array.from({ length: 300 }, (_, number) => automatic(number));
    const covers = designsForRow(row);
    for (let index = 1; index < covers.length; index += 1) {
      expect(covers[index]?.design).not.toBe(covers[index - 1]?.design);
    }
  });

  it('moves only the clashing card, to its own second choice, and keeps the row stable', () => {
    // Find two stories whose first choices clash.
    const first = automatic(0);
    const clashing = Array.from({ length: 500 }, (_, number) => automatic(number + 1)).find(
      (story) => automaticCoverFor(story.id).design === automaticCoverFor(first.id).design,
    );
    expect(clashing).toBeDefined();
    if (clashing === undefined) return;
    const covers = designsForRow([first, clashing]);
    expect(covers[0]).toEqual(automaticCoverFor(first.id));
    expect(covers[1]?.design).toBe(automaticDesignChoices(clashing.id, 2)[1]);
    // The same row again gives the same answer; adding a card at the end changes nothing before it.
    expect(designsForRow([first, clashing])).toEqual(covers);
    expect(designsForRow([first, clashing, automatic(9)]).slice(0, 2)).toEqual(covers);
  });

  it('never changes a design the writer chose, even when it repeats the neighbour’s', () => {
    const chosen = { design: 'plum', background: 'plum', accent: 'gold' } as const;
    const row: CoverSource[] = [
      { id: storyId(1), coverKind: 'drawn', drawnCover: chosen },
      { id: storyId(2), coverKind: 'drawn', drawnCover: chosen },
    ];
    expect(designsForRow(row)).toEqual([chosen, chosen]);
  });
});
