/**
 * classNewForm: the shapes and field ids of "Create a class space" (bundle BOOKS-8, part 8b; board
 * G07-ClassNew), kept apart from the components so both NewClassSpaceForm and ClassNewFields
 * share them.
 * Who uses it: NewClassSpaceForm and ClassNewFields. What it calls: nothing.
 */

/** The ids the form moves focus to when a field is missing. */
export const classFieldIds = {
  name: 'class-new-name',
  grade: 'class-new-grade',
  school: 'class-new-school',
  description: 'class-new-description',
} as const;

/** What the teacher has typed so far. */
export interface ClassNewValues {
  name: string;
  /** The grade as text, or '' until one is chosen. */
  grade: string;
  school: string;
  description: string;
}

/** Which needed fields were empty when the form was sent. */
export type ClassNewMissing = Partial<Record<'name' | 'grade' | 'school', boolean>>;
