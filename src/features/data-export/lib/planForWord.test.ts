/**
 * Tests for turning Story Atlas rows into a story's plan file (story S1-E13-05; Robert, 1 Nov
 * 2026, 06:27). The words are the keys themselves, so each line can be checked by key.
 */
import { describe, expect, it } from 'vitest';

import { plansFrom, type PlanWords } from './planForWord';

const words: PlanWords = {
  atlas: (key, values) => (values === undefined ? key : `${key} ${JSON.stringify(values)}`),
  own: (key, values) => (values === undefined ? key : `${key} ${JSON.stringify(values)}`),
  chapterNumber: (position) => `Chapter ${position}`,
  formatDate: (isoDate) => isoDate.slice(0, 10),
};

/** A data file with one story and the given Story Atlas tables. */
function dataFile(tables: Record<string, unknown[]>) {
  return {
    format: 'data-export/1',
    made_at: '2026-11-01T00:00:00Z',
    user_id: 'user-1',
    account: { profile: { handle: 'lia', pen_name: 'Lia M.' } },
    tables: {
      stories: [
        { id: 's1', slug: 'ploaia', title: 'Ploaia', language_code: 'ro', deleted_at: null },
      ],
      chapters: [
        { id: 'c1', story_id: 's1', position: 1, draft_title: 'Începutul', deleted_at: null },
      ],
      ...tables,
    },
  } as never;
}

describe('plansFrom', () => {
  it('a story with nothing planned has no parts, and says so', () => {
    const [entry] = plansFrom(dataFile({}), words);
    expect(entry?.slug).toBe('ploaia');
    expect(entry?.plan.parts).toEqual([]);
    expect(entry?.plan.emptyNote).toBe('plan.empty');
    expect(entry?.plan.writerName).toBe('Lia M.');
  });

  it('a character keeps its sheet in order, the writer’s own fields and its first chapter', () => {
    const [entry] = plansFrom(
      dataFile({
        story_characters: [
          {
            id: 'k1',
            story_id: 's1',
            name: 'Ana',
            role: 'protagonist',
            sheet: { voice: 'Quiet', species: 'Human' },
            custom_values: { f1: 'Blue' },
            first_appearance_chapter_id: 'c1',
          },
        ],
        story_character_fields: [{ id: 'f1', story_id: 's1', name: 'Favourite colour' }],
      }),
      words,
    );
    const characters = entry?.plan.parts.find((part) => part.heading === 'characters.heading');
    expect(characters?.entries[0]?.details.map((detail) => detail.label)).toEqual([
      'characters.roleLabel',
      'characters.fields.species',
      'characters.fields.voice',
      'Favourite colour',
      'characters.firstAppearance',
    ]);
    expect(characters?.entries[0]?.details.at(-1)?.value).toBe('Chapter 1: Începutul');
  });

  it('a cousin says which cousin, and an "Other" one reads the other way round too', () => {
    const [entry] = plansFrom(
      dataFile({
        story_characters: [
          { id: 'k1', story_id: 's1', name: 'Ana', role: 'minor', sheet: {}, custom_values: {} },
          { id: 'k2', story_id: 's1', name: 'Ilinca', role: 'minor', sheet: {}, custom_values: {} },
        ],
        story_character_relationships: [
          {
            ...{ id: 'r1', story_id: 's1', from_character_id: 'k1', to_character_id: 'k2' },
            ...{ kind: 'cousin_of', custom_label: '', reverse_label: '', note: '' },
            ...{ cousin_degree: 2, cousin_removed: 1 },
          },
          {
            ...{ id: 'r2', story_id: 's1', from_character_id: 'k1', to_character_id: 'k2' },
            ...{ kind: 'custom', custom_label: 'godmother of', reverse_label: 'goddaughter of' },
            ...{ note: '', cousin_degree: null, cousin_removed: null },
          },
        ],
      }),
      words,
    );
    const connections = entry?.plan.parts.find((part) => part.heading === 'connections.heading');
    // The fake words print the key and the values, so "which" shows the cousin's own keys.
    expect(connections?.entries[0]?.title).toContain('connections.cousin.degree2');
    expect(connections?.entries[0]?.title).toContain('connections.cousin.removed1');
    expect(connections?.entries[1]?.details).toEqual([
      {
        label: 'connections.otherWay',
        value: expect.stringContaining('"from":"Ilinca","to":"Ana","label":"goddaughter of"'),
      },
    ]);
  });

  it('bible entries, events, ideas and marketing each become a part with their text', () => {
    const [entry] = plansFrom(
      dataFile({
        story_bible_sections: [
          { id: 'b1', story_id: 's1', preset: 'world', name: '', position: 1 },
        ],
        story_bible_entries: [
          {
            id: 'e1',
            story_id: 's1',
            section_id: 'b1',
            title: 'Ploiești',
            tags: ['town'],
            body: 'Hot.',
          },
        ],
        story_events: [
          {
            id: 'v1',
            story_id: 's1',
            title: 'Flood',
            display_date: '1989',
            sort_value: 1989,
            description: null,
          },
        ],
        story_ideas: [
          {
            id: 'i1',
            story_id: 's1',
            kind: 'question',
            body: 'Why?',
            outcome: null,
            done_at: null,
            created_at: '2026-10-01',
          },
        ],
        story_marketing: [
          {
            story_id: 's1',
            back_cover_blurb: 'A summer.',
            comparable_titles: '',
            hooks_keywords: '',
            query_pitch: '',
            launch_notes: '',
          },
        ],
      }),
      words,
    );
    expect(entry?.plan.parts.map((part) => part.heading)).toEqual([
      'bible.heading',
      'storyline.heading',
      'ideas.heading',
      'marketing.heading',
    ]);
    const bible = entry?.plan.parts[0]?.entries[0];
    expect(bible?.details).toEqual([
      { label: 'bible.entry.section', value: 'bible.presets.world' },
      { label: 'bible.entry.tags', value: 'town' },
    ]);
    expect(bible?.markdown).toBe('Hot.');
  });

  it('a chapter told by the Narrator says so, though the Narrator is nobody in the cast', () => {
    const [entry] = plansFrom(
      dataFile({
        chapter_plans: [
          {
            chapter_id: 'c1',
            story_id: 's1',
            kind: 'chapter',
            planning_status: 'idea',
            pov_character_id: null,
            pov_is_narrator: true,
            act_id: null,
            word_target: null,
            world_date: '',
            location: '',
            summary: '',
          },
        ],
      }),
      words,
    );
    const plan = entry?.plan.parts.find((part) => part.heading === 'plan.chapterPlans')?.entries[0];
    expect(plan?.details).toContainEqual({
      label: 'chapterPlan.pov',
      value: 'chapterPlan.narrator',
    });
  });

  it('a chapter plan names its point of view, its people and its scenes', () => {
    const [entry] = plansFrom(
      dataFile({
        story_characters: [
          { id: 'k1', story_id: 's1', name: 'Ana', role: 'minor', sheet: {}, custom_values: {} },
        ],
        chapter_plans: [
          {
            chapter_id: 'c1',
            story_id: 's1',
            kind: 'chapter',
            planning_status: 'outlined',
            pov_character_id: 'k1',
            act_id: null,
            word_target: null,
            world_date: '',
            location: 'Shop',
            summary: 'She arrives.',
          },
        ],
        chapter_plan_characters: [{ chapter_id: 'c1', character_id: 'k1', story_id: 's1' }],
        chapter_scenes: [
          {
            id: 'n1',
            chapter_id: 'c1',
            story_id: 's1',
            position: 1,
            title: 'Door',
            status: 'idea',
            summary: null,
          },
        ],
      }),
      words,
    );
    const plan = entry?.plan.parts.find((part) => part.heading === 'plan.chapterPlans')?.entries[0];
    expect(plan?.title).toBe('Chapter 1: Începutul');
    expect(plan?.details).toContainEqual({ label: 'chapterPlan.pov', value: 'Ana' });
    expect(plan?.details).toContainEqual({ label: 'chapterPlan.present', value: 'Ana' });
    expect(plan?.details.at(-1)?.value).toBe('Door · chapterPlan.statuses.idea');
    expect(plan?.markdown).toBe('She arrives.');
  });
});
