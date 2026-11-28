/**
 * A play's cast, the story's list of characters (LAYOUTS-2; board D14-EditorPlay, "Characters").
 *
 * The same rules as the database's play_cast_problem() (supabase/migrations/…_layouts2_play_cast.sql):
 * at most 60 characters, a name of 1 to 40 characters, a note of up to 80, no name twice
 * (ignoring capitals). The editor checks them before it saves, so the writer sees what to fix
 * beside the field; the database checks them again.
 * Who uses it: src/features/writing/api/playCast.ts (reading the stored list) and the Characters
 * panel (PlayCastPanel, its form).
 */
import { z } from 'zod';

/** The most characters a cast holds. */
export const MAXIMUM_CAST_SIZE = 60;

/** The longest name (the same as a speech's name, playDocument.ts). */
export const MAXIMUM_CAST_NAME_LENGTH = 40;

/** The longest note under a name ("sings alto, sixteen"). */
export const MAXIMUM_CAST_NOTE_LENGTH = 80;

/** One character: a name and a short note, which may be empty. */
export const castMemberSchema = z.object({
  name: z.string().trim().min(1).max(MAXIMUM_CAST_NAME_LENGTH),
  note: z.string().trim().max(MAXIMUM_CAST_NOTE_LENGTH).default(''),
});

/** A character as the editor holds it. */
export type CastMember = z.infer<typeof castMemberSchema>;

/** The whole cast as stored: a list, no name twice. */
export const playCastSchema = z
  .array(castMemberSchema)
  .max(MAXIMUM_CAST_SIZE)
  .refine(
    (cast) => new Set(cast.map((member) => member.name.toLowerCase())).size === cast.length,
    'duplicate_name',
  );

/**
 * Reads a stored cast, keeping what is well formed: an entry the schema refuses is dropped
 * rather than breaking the editor.
 *
 * @param stored - stories.play_cast as the database gives it
 * @returns the characters, in the writer's order
 */
export function readStoredCast(stored: unknown): CastMember[] {
  if (!Array.isArray(stored)) return [];
  const cast: CastMember[] = [];
  for (const entry of stored) {
    const parsed = castMemberSchema.safeParse(entry);
    if (parsed.success) cast.push(parsed.data);
  }
  return cast;
}
