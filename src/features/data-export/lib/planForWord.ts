/**
 * Turns the data file's Story Atlas rows into each story's plan for the plan builder (story
 * S1-E13-05; Robert, 1 Nov 2026, 06:27: the downloads hold the story bible, the characters and
 * everything else the writer made in Story Atlas, not only the chapters).
 *
 * The rules:
 * - every story the person still has gets a plan; a part with nothing in it is left out, and a
 *   plan with no parts says so in one line;
 * - the words are Story Atlas's own (the atlas texts), so the file reads like the screens;
 * - every row is the writer's own, private or public (the data file holds only their rows).
 * Who calls it: runDataExport.ts and runStoriesExport.ts. What it calls: nothing; it is pure, so
 * it is tested alone (planForWord.test.ts).
 */
import { sheetGroups, type SheetKey } from '@/features/atlas/api/characters';
import { cousinPhrase } from '@/features/atlas/lib/cousinWords';
import type { Tables } from '@/lib/database.types';
import type { WordPlan, WordPlanDetail, WordPlanEntry, WordPlanPart } from '@/lib/word/wordTypes';

import type { DataExportDocument } from '../api/dataExport';

/** Translates a key of the atlas or dataExport texts, with values filled in. */
export type PlanTranslate = (key: string, values?: Record<string, string | number>) => string;

/** What the plan needs besides the rows: the words, chapter names and dates. */
export interface PlanWords {
  /** A key of the atlas texts ("nav.characters"). */
  atlas: PlanTranslate;
  /** A key of the dataExport texts ("plan.title"). */
  own: PlanTranslate;
  /** "Chapter {{number}}" filled in, as the story's own file prints it. */
  chapterNumber: (position: number) => string;
  formatDate: (isoDate: string) => string;
}

/** One story's plan, with the slug its file is named after. */
export interface PlanForWord {
  slug: string;
  plan: WordPlan;
}

/** The Story Atlas rows of one story, from the data file. */
interface StoryRows {
  plan: Tables<'story_plans'> | null;
  acts: Tables<'story_plan_acts'>[];
  characters: Tables<'story_characters'>[];
  fields: Tables<'story_character_fields'>[];
  connections: Tables<'story_character_relationships'>[];
  sections: Tables<'story_bible_sections'>[];
  entries: Tables<'story_bible_entries'>[];
  events: Tables<'story_events'>[];
  chapterPlans: Tables<'chapter_plans'>[];
  present: Tables<'chapter_plan_characters'>[];
  scenes: Tables<'chapter_scenes'>[];
  ideas: Tables<'story_ideas'>[];
  marketing: Tables<'story_marketing'> | null;
  /** The story's chapters, live ones only, for chapter names. */
  chapters: { id: string; position: number; draft_title: string; deleted_at: string | null }[];
}

/** The rows of one table of the data file, or none when the table is missing. */
function rowsOf(document: DataExportDocument, tableName: string): unknown[] {
  const rows = document.tables[tableName];
  return Array.isArray(rows) ? rows : [];
}

/** Every Story Atlas row of one story. */
function storyRows(document: DataExportDocument, storyId: string): StoryRows {
  const of = <Row extends { story_id: string }>(tableName: string): Row[] =>
    (rowsOf(document, tableName) as Row[]).filter((row) => row.story_id === storyId);
  return {
    plan: of<Tables<'story_plans'>>('story_plans')[0] ?? null,
    acts: of<Tables<'story_plan_acts'>>('story_plan_acts'),
    characters: of<Tables<'story_characters'>>('story_characters'),
    fields: of<Tables<'story_character_fields'>>('story_character_fields'),
    connections: of<Tables<'story_character_relationships'>>('story_character_relationships'),
    sections: of<Tables<'story_bible_sections'>>('story_bible_sections'),
    entries: of<Tables<'story_bible_entries'>>('story_bible_entries'),
    events: of<Tables<'story_events'>>('story_events'),
    chapterPlans: of<Tables<'chapter_plans'>>('chapter_plans'),
    present: of<Tables<'chapter_plan_characters'>>('chapter_plan_characters'),
    scenes: of<Tables<'chapter_scenes'>>('chapter_scenes'),
    ideas: of<Tables<'story_ideas'>>('story_ideas'),
    marketing: of<Tables<'story_marketing'>>('story_marketing')[0] ?? null,
    chapters: (document.tables.chapters ?? [])
      .filter((chapter) => chapter.story_id === storyId && chapter.deleted_at === null)
      .map((chapter) => ({
        id: chapter.id,
        position: chapter.position,
        draft_title: chapter.draft_title,
        deleted_at: chapter.deleted_at,
      })),
  };
}

/** Lines with a value only: an empty field prints nothing. */
function filledDetails(details: { label: string; value: string | null | undefined }[]) {
  const filled: WordPlanDetail[] = [];
  for (const detail of details) {
    const value = (detail.value ?? '').trim();
    if (value !== '') filled.push({ label: detail.label, value });
  }
  return filled;
}

/** A part, or null when it has no entries. */
function partOrNull(heading: string, entries: WordPlanEntry[]): WordPlanPart | null {
  return entries.length === 0 ? null : { heading, entries };
}

/** "Chapter 3: The storm" for a chapter ID, or null when it is gone. */
function chapterName(rows: StoryRows, words: PlanWords, chapterId: string | null): string | null {
  const chapter = rows.chapters.find((candidate) => candidate.id === chapterId);
  if (chapter === undefined) return null;
  const number = words.chapterNumber(chapter.position);
  return chapter.draft_title.trim() === '' ? number : `${number}: ${chapter.draft_title}`;
}

/** A character's name by ID, or an empty text when it is gone. */
function characterName(rows: StoryRows, characterId: string | null): string {
  return rows.characters.find((character) => character.id === characterId)?.name ?? '';
}

/** At a glance: the logline, the series, the target, the status, the route and the link. */
function glancePart(rows: StoryRows, words: PlanWords): WordPlanPart | null {
  const plan = rows.plan;
  if (plan === null) return null;
  const link = [plan.linked_project_label, plan.linked_project_url].filter(Boolean).join(': ');
  const details = filledDetails([
    { label: words.atlas('details.logline'), value: plan.logline },
    { label: words.atlas('details.seriesName'), value: plan.series_name },
    { label: words.atlas('details.wordTarget'), value: String(plan.word_target ?? '') },
    {
      label: words.atlas('details.writingStatus'),
      value: words.atlas(`writingStatus.${plan.writing_status}`),
    },
    {
      label: words.atlas('details.publishingRoute'),
      value: words.atlas(`publishingRoute.${plan.publishing_route}`),
    },
    { label: words.atlas('linked.heading'), value: link },
  ]);
  return partOrNull(words.atlas('nav.glance'), [{ title: null, details, markdown: null }]);
}

/** A character's sheet, in the screen's order, then the writer's own fields. */
function characterDetails(
  character: Tables<'story_characters'>,
  rows: StoryRows,
  words: PlanWords,
) {
  const sheet = (character.sheet ?? {}) as Partial<Record<SheetKey, string>>;
  const customValues = (character.custom_values ?? {}) as Record<string, string>;
  const sheetKeys = Object.values(sheetGroups).flat() as SheetKey[];
  return filledDetails([
    {
      label: words.atlas('characters.roleLabel'),
      value: words.atlas(`characters.role.${character.role}`),
    },
    ...sheetKeys.map((key) => ({
      label: words.atlas(`characters.fields.${key}`),
      value: sheet[key],
    })),
    ...rows.fields.map((field) => ({ label: field.name, value: customValues[field.id] })),
    {
      label: words.atlas('characters.firstAppearance'),
      value: chapterName(rows, words, character.first_appearance_chapter_id),
    },
  ]);
}

/** Characters: one entry each, by name. */
function charactersPart(rows: StoryRows, words: PlanWords): WordPlanPart | null {
  const entries = [...rows.characters]
    .sort((first, second) => first.name.localeCompare(second.name))
    .map((character) => ({
      title: character.name,
      details: characterDetails(character, rows, words),
      markdown: null,
    }));
  return partOrNull(words.atlas('characters.heading'), entries);
}

/** One connection as a sentence: from the first character, or the other way round. */
function connectionSentence(
  rows: StoryRows,
  words: PlanWords,
  connection: Tables<'story_character_relationships'>,
  isReversed: boolean,
): string {
  const fromId = isReversed ? connection.to_character_id : connection.from_character_id;
  const toId = isReversed ? connection.from_character_id : connection.to_character_id;
  return words.atlas(`connections.sentences.${connection.kind}`, {
    from: characterName(rows, fromId),
    to: characterName(rows, toId),
    label: isReversed ? connection.reverse_label : (connection.custom_label ?? ''),
    // A cousin says which cousin: "second cousin once removed" (G10b).
    which: cousinPhrase(
      (key) => words.atlas(key),
      connection.cousin_degree,
      connection.cousin_removed,
    ),
  });
}

/**
 * Connections: one sentence each ("Ana is a friend of Matei"), with its note, and for an "Other"
 * one with a reverse label, the sentence the other way round (G10b).
 */
function connectionsPart(rows: StoryRows, words: PlanWords): WordPlanPart | null {
  const entries = rows.connections.map((connection) => ({
    title: connectionSentence(rows, words, connection, false),
    details:
      connection.kind === 'custom' && connection.reverse_label !== ''
        ? [
            {
              label: words.atlas('connections.otherWay'),
              value: connectionSentence(rows, words, connection, true),
            },
          ]
        : [],
    markdown: (connection.note ?? '').trim() === '' ? null : connection.note,
  }));
  return partOrNull(words.atlas('connections.heading'), entries);
}

/** A bible section's name: the writer's own, or the preset's. */
function sectionName(rows: StoryRows, words: PlanWords, sectionId: string | null): string {
  const section = rows.sections.find((candidate) => candidate.id === sectionId);
  if (section === undefined) return '';
  if (section.name.trim() !== '') return section.name;
  return section.preset === null ? '' : words.atlas(`bible.presets.${section.preset}`);
}

/** Story bible: one entry each, in section order, then by title. */
function biblePart(rows: StoryRows, words: PlanWords): WordPlanPart | null {
  const sectionOrder = new Map(rows.sections.map((section) => [section.id, section.position]));
  const entries = [...rows.entries]
    .sort(
      (first, second) =>
        (sectionOrder.get(first.section_id) ?? 0) - (sectionOrder.get(second.section_id) ?? 0) ||
        first.title.localeCompare(second.title),
    )
    .map((entry) => ({
      title: entry.title,
      details: filledDetails([
        {
          label: words.atlas('bible.entry.section'),
          value: sectionName(rows, words, entry.section_id),
        },
        { label: words.atlas('bible.entry.tags'), value: (entry.tags ?? []).join(', ') },
      ]),
      markdown: entry.body.trim() === '' ? null : entry.body,
    }));
  return partOrNull(words.atlas('bible.heading'), entries);
}

/** Storyline: the timeline's events, earliest first. */
function storylinePart(rows: StoryRows, words: PlanWords): WordPlanPart | null {
  const entries = [...rows.events]
    .sort((first, second) => Number(first.sort_value) - Number(second.sort_value))
    .map((event) => ({
      title: event.title,
      details: filledDetails([
        { label: words.atlas('storyline.timeline.add.displayDate'), value: event.display_date },
      ]),
      markdown: (event.description ?? '').trim() === '' ? null : event.description,
    }));
  return partOrNull(words.atlas('storyline.heading'), entries);
}

/** One chapter's scenes as lines: "Scene 1: The storm · Drafting · …". */
function sceneDetails(rows: StoryRows, words: PlanWords, chapterId: string): WordPlanDetail[] {
  return rows.scenes
    .filter((scene) => scene.chapter_id === chapterId)
    .sort((first, second) => first.position - second.position)
    .map((scene) => ({
      label: words.own('plan.scene', { number: scene.position }),
      value: [scene.title, words.atlas(`chapterPlan.statuses.${scene.status}`), scene.summary ?? '']
        .filter((part) => part.trim() !== '')
        .join(' · '),
    }));
}

/** One chapter's plan: its type, status, point of view, act, place, people and scenes. */
function chapterPlanEntry(
  chapterPlan: Tables<'chapter_plans'>,
  rows: StoryRows,
  words: PlanWords,
): WordPlanEntry {
  const present = rows.present
    .filter((row) => row.chapter_id === chapterPlan.chapter_id)
    .map((row) => characterName(rows, row.character_id))
    .join(', ');
  const actName = rows.acts.find((act) => act.id === chapterPlan.act_id)?.name ?? '';
  const details = filledDetails([
    {
      label: words.atlas('chapterPlan.kind'),
      value: words.atlas(`chapterPlan.kinds.${chapterPlan.kind}`),
    },
    {
      label: words.atlas('chapterPlan.status'),
      value: words.atlas(`chapterPlan.statuses.${chapterPlan.planning_status}`),
    },
    {
      label: words.atlas('chapterPlan.pov'),
      // The Narrator is nobody in the cast, so the export names them in words (G10c2).
      value: chapterPlan.pov_is_narrator
        ? words.atlas('chapterPlan.narrator')
        : characterName(rows, chapterPlan.pov_character_id),
    },
    { label: words.atlas('chapterPlan.act'), value: actName },
    { label: words.atlas('chapterPlan.wordTarget'), value: String(chapterPlan.word_target ?? '') },
    { label: words.atlas('chapterPlan.worldDate'), value: chapterPlan.world_date },
    { label: words.atlas('chapterPlan.location'), value: chapterPlan.location },
    { label: words.atlas('chapterPlan.present'), value: present },
  ]);
  return {
    title: chapterName(rows, words, chapterPlan.chapter_id),
    details: [...details, ...sceneDetails(rows, words, chapterPlan.chapter_id)],
    markdown: (chapterPlan.summary ?? '').trim() === '' ? null : chapterPlan.summary,
  };
}

/** Chapter plans: one entry per live chapter that has a plan, in chapter order. */
function chapterPlansPart(rows: StoryRows, words: PlanWords): WordPlanPart | null {
  const positionOf = new Map(rows.chapters.map((chapter) => [chapter.id, chapter.position]));
  const entries = rows.chapterPlans
    .filter((chapterPlan) => positionOf.has(chapterPlan.chapter_id))
    .sort(
      (first, second) =>
        (positionOf.get(first.chapter_id) ?? 0) - (positionOf.get(second.chapter_id) ?? 0),
    )
    .map((chapterPlan) => chapterPlanEntry(chapterPlan, rows, words));
  return partOrNull(words.own('plan.chapterPlans'), entries);
}

/** Questions and ideas: one entry each, oldest first, with the outcome and when it was done. */
function ideasPart(rows: StoryRows, words: PlanWords): WordPlanPart | null {
  const entries = [...rows.ideas]
    .sort((first, second) => first.created_at.localeCompare(second.created_at))
    .map((idea) => ({
      title: words.atlas(`ideas.kinds.${idea.kind}`),
      details: filledDetails([
        { label: words.atlas('ideas.outcome'), value: idea.outcome },
        {
          label: words.own('plan.done'),
          value: idea.done_at === null ? null : words.formatDate(idea.done_at),
        },
      ]),
      markdown: idea.body.trim() === '' ? null : idea.body,
    }));
  return partOrNull(words.atlas('ideas.heading'), entries);
}

/** The marketing fields, in the screen's order. */
const marketingFields = [
  'back_cover_blurb',
  'comparable_titles',
  'hooks_keywords',
  'query_pitch',
  'launch_notes',
] as const;

/** Marketing: one entry per field the writer filled in. */
function marketingPart(rows: StoryRows, words: PlanWords): WordPlanPart | null {
  const marketing = rows.marketing;
  if (marketing === null) return null;
  const entries = marketingFields
    .filter((field) => (marketing[field] ?? '').trim() !== '')
    .map((field) => ({
      title: words.atlas(`marketing.fields.${field}`),
      details: [],
      markdown: marketing[field],
    }));
  return partOrNull(words.atlas('marketing.heading'), entries);
}

/** Every part of one story's plan, in Story Atlas's order, the empty ones left out. */
function planParts(rows: StoryRows, words: PlanWords): WordPlanPart[] {
  const parts = [
    glancePart(rows, words),
    charactersPart(rows, words),
    connectionsPart(rows, words),
    biblePart(rows, words),
    storylinePart(rows, words),
    chapterPlansPart(rows, words),
    ideasPart(rows, words),
    marketingPart(rows, words),
  ];
  return parts.filter((part): part is WordPlanPart => part !== null);
}

/**
 * Each live story's plan, ready for planToWord().
 *
 * @param document - the data file (narrowed or whole)
 * @param words - the translated words, the chapter names and the date format
 * @returns one plan per story the person still has, in the data file's order
 */
export function plansFrom(document: DataExportDocument, words: PlanWords): PlanForWord[] {
  const profile = document.account.profile;
  const writerName = profile?.pen_name ?? profile?.handle ?? '';
  return (document.tables.stories ?? [])
    .filter((story) => story.deleted_at === null)
    .map((story) => ({
      slug: story.slug,
      plan: {
        title: words.own('plan.title', { title: story.title }),
        writerName,
        userId: document.user_id,
        languageCode: story.language_code,
        parts: planParts(storyRows(document, story.id), words),
        emptyNote: words.own('plan.empty'),
      },
    }));
}
