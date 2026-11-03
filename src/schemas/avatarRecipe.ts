/**
 * The drawn avatar's recipe (bundle ADMIN-2, part g; Robert's brief of 2 Nov 2026, section 7):
 * what Settings › Profile saves on the profile and every round avatar draws.
 * The database checks the same shape (avatar_recipe_valid(), …_admin2_g_avatar_builder.sql):
 * colours are six hex digits and parts are short plain words, so nothing but a look reaches the
 * SVG. Which values the builder offers is up to src/features/avatars/lib/avatarOptions.ts.
 * Who uses it: src/features/avatars/ (api, lib).
 */
import { z } from 'zod';

/** A colour as six lower-case hex digits, without "#". */
const hexColour = z.string().regex(/^[0-9a-f]{6}$/);

/** A part's name: 1 to 24 letters or digits ("none" for no facial hair or accessory). */
const partName = z.string().regex(/^[A-Za-z0-9]{1,24}$/);

/** One recipe. */
export const avatarRecipeSchema = z
  .object({
    style: z.literal('open-peeps'),
    version: z.literal(1),
    skin: hexColour,
    head: partName,
    hairColour: hexColour,
    expression: partName,
    facialHair: partName,
    accessory: partName,
    clothes: hexColour,
    background: hexColour,
  })
  .strict();

/** A checked recipe. */
export type AvatarRecipe = z.infer<typeof avatarRecipeSchema>;
