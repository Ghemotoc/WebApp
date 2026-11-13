# class-competitions

Class competitions in a private class space (bundle CLASS-POINTS, part 2; stories S1-E8-15,
S1-E8-17 and S1-E8-19; Robert, 13 Nov 2026). A teacher starts a competition with their own grading
criteria, pupils choose to join, the teacher assesses each entry and confirms one Winner. Nobody
is ranked and the app never suggests a Winner.

The rules live in the database, never here: one running competition per class; the class needs a
school year first, and below the 8th there is no Winner and no Finalist (every entrant is a
Contestant); only pupils who joined get a result; results can't change once confirmed; scores and
totals reach only the teacher. A pupil's card carries the Winner's pen name, the winning chapter,
the Readers' choice pen names and the pupil's own result, nothing else.

- `api/classCompetitions.ts`: the class page's read and the teacher's and pupils' actions
  (`class_competitions()`, `set_class_grade()`, `save_class_competition()`,
  `end_class_competition()`, `delete_class_competition()`, `join_class_competition()`,
  `leave_class_competition()`).
- `api/competitionScoring.ts`: the teacher's results page (`class_competition_scoring()`,
  `save_class_competition_scores()`, `publish_class_competition()`).
- `api/criteriaTemplates.ts`: the teacher's own saved criteria (`my_criteria_templates()`,
  `save_criteria_template()`, `delete_criteria_template()`). The app ships no templates.
- `api/competitionErrors.ts`: a refusal's hint as a plain reason (`CompetitionError`); each reason
  has a sentence under `failures` in `classCompetitions.json`.
- `hooks/`: the reads and changes. After a change every competition read is fetched again, so the
  class page, the form and the results agree.
- `lib/criteriaDraft.ts`: pure helpers for editing a list of criteria and for totals;
  `lib/typedScores.ts`: reading the score fields; `lib/competitionDates.ts`: the form's starting
  dates, counted from the database's today, not the device's clock.
- On a class page: `ClassCompetitionCard` (the running competition with `CriteriaList`, the
  pupil's `PupilControls` or the teacher's `TeacherControls`, then one `WinnerCard` per confirmed
  competition). In the class's settings: `ClassGradeCard` (the school year).
- `/spaces/<slug>/competition`: `CompetitionFormPage` with `CriteriaEditor` and
  `CriteriaTemplateTools` ("Use template", "Save as template").
- `/spaces/<slug>/competition/templates`: `CriteriaTemplatesPage`.
- `/spaces/<slug>/competition/<id>/results`: `CompetitionResultsPage` with one
  `EntrantScoreCard` per entrant (the outcomes as a checklist beside the score; ticks are never
  saved) and `ResultsForm` (Winner, winning chapter, Finalists, then `ConfirmedButton`).
- `competitionPages.ts`: the three pages behind one lazy import, to keep the first download small.
- `registerClassCompetitionsTranslations.ts`: the texts (`classCompetitions.json`), loaded with the
  feature.

Tests: `supabase/tests/database/379-class-competitions.test.sql`,
`380-class-competition-results.test.sql`, `api/classCompetitions.test.ts`,
`lib/criteriaDraft.test.ts`, `lib/typedScores.test.ts`, `lib/competitionDates.test.ts`,
`e2e/class-competitions.spec.ts`.
