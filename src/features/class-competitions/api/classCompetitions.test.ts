/**
 * Tests for the class competition readers (bundle CLASS-POINTS, part 2): what the database
 * answers becomes the shapes the screens use, and a refusal becomes a plain reason.
 */
import { describe, expect, it } from 'vitest';

import { classCompetitionsFrom, criteriaToJson } from './classCompetitions';
import { competitionErrorFrom, competitionFailureOf } from './competitionErrors';
import { scoringFrom } from './competitionScoring';
import { templatesFrom } from './criteriaTemplates';

const criterion = {
  id: 'c1',
  label: 'Language',
  max_points: 20,
  description: 'How the text is written.',
  outcomes: ['uses dialogue to show character'],
};

describe('classCompetitionsFrom', () => {
  it('answers null while the class has no competitions to show', () => {
    expect(classCompetitionsFrom(null)).toBeNull();
  });

  it('reads a pupil’s view of a running competition', () => {
    const read = classCompetitionsFrom({
      role: 'pupil',
      grade: 9,
      winners_allowed: true,
      is_archived: false,
      running: {
        id: 'k1',
        name: 'Spring stories',
        starts_on: '2027-03-01',
        ends_on: '2027-03-15',
        phase: 'open',
        criteria: [criterion],
        is_entrant: false,
        can_join: true,
        can_leave: false,
        entrant_count: null,
      },
      published: [],
    });
    expect(read?.role).toBe('pupil');
    expect(read?.running?.canJoin).toBe(true);
    expect(read?.running?.entrantCount).toBeNull();
    expect(read?.running?.criteria[0]).toEqual({
      id: 'c1',
      label: 'Language',
      maxPoints: 20,
      description: 'How the text is written.',
      outcomes: ['uses dialogue to show character'],
    });
  });

  it('reads a Winner card with pen names only and the viewer’s own result', () => {
    const read = classCompetitionsFrom({
      role: 'pupil',
      grade: 9,
      winners_allowed: true,
      running: null,
      published: [
        {
          id: 'k1',
          name: 'Spring stories',
          published_on: '2027-03-20',
          winner: 'Mara',
          winning_chapter: {
            title: 'The lake',
            story_title: 'North',
            story_slug: 'north',
            chapter_code: 'abc',
          },
          readers_choice: ['Ilinca'],
          my_result: 'finalist',
          my_readers_choice: false,
        },
      ],
    });
    const card = read?.published[0];
    expect(card?.winner).toBe('Mara');
    expect(card?.winningChapter?.storySlug).toBe('north');
    expect(card?.readersChoice).toEqual(['Ilinca']);
    expect(card?.myResult).toBe('finalist');
  });

  it('reads a card with no Winner below the 8th grade', () => {
    const read = classCompetitionsFrom({
      role: 'pupil',
      grade: 6,
      winners_allowed: false,
      running: null,
      published: [{ id: 'k1', name: 'Autumn', winner: null, my_result: 'participant' }],
    });
    expect(read?.areWinnersAllowed).toBe(false);
    expect(read?.published[0]?.winner).toBeNull();
    expect(read?.published[0]?.myResult).toBe('participant');
  });
});

describe('criteriaToJson', () => {
  it('sends the database’s field names and drops empty outcome lines', () => {
    const sent = criteriaToJson([
      {
        id: null,
        label: 'Plot',
        maxPoints: 10,
        description: 'd',
        outcomes: ['has an ending', ' '],
      },
    ]);
    expect(sent).toEqual([
      { label: 'Plot', max_points: 10, description: 'd', outcomes: ['has an ending'] },
    ]);
  });
});

describe('scoringFrom', () => {
  it('reads the entrants with their guide numbers, chapters and scores', () => {
    const scoring = scoringFrom({
      id: 'k1',
      name: 'Spring stories',
      phase: 'judging',
      class_slug: 'class-9b',
      winners_allowed: true,
      criteria: [criterion],
      entrants: [
        {
          handle: 'mara',
          display_name: 'Mara',
          class_points: 7,
          teacher_points: 12,
          chapters: [{ id: 'ch1', title: 'The lake', story_title: 'North', position: 1 }],
          scores: { c1: 18, broken: 'x' },
          result: null,
          readers_choice: false,
        },
      ],
    });
    expect(scoring.phase).toBe('judging');
    expect(scoring.entrants[0]?.scores).toEqual({ c1: 18 });
    expect(scoring.entrants[0]?.chapters[0]?.title).toBe('The lake');
    expect(scoring.entrants[0]?.result).toBeNull();
  });
});

describe('templatesFrom', () => {
  it('reads the teacher’s templates and answers an empty list for anything else', () => {
    expect(templatesFrom([{ id: 't1', name: 'Essays', criteria: [criterion] }])[0]?.name).toBe(
      'Essays',
    );
    expect(templatesFrom(null)).toEqual([]);
  });
});

describe('competitionErrorFrom', () => {
  it('turns the database’s hint into a plain reason', () => {
    expect(competitionErrorFrom({ hint: 'competition:unscored' }).failure).toBe('unscored');
    expect(competitionErrorFrom({ hint: 'template:name_taken' }).failure).toBe(
      'template_name_taken',
    );
  });

  it('reads a refused permission as “not allowed” and anything else as unreachable', () => {
    expect(competitionErrorFrom({ code: '42501' }).failure).toBe('not_allowed');
    expect(competitionErrorFrom({}).failure).toBe('unreachable');
    expect(competitionFailureOf(new Error('network'))?.failure).toBe('unreachable');
    expect(competitionFailureOf(null)).toBeNull();
  });
});
