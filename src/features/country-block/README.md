# Country block

Hiding a story in chosen countries. Built by bundle COUNTRY-1 (Robert, 21 Nov 2026; boards D07 Story settings › Where it shows, B11 the reader's page, S29 Classics › Hide in countries).

- `components/HiddenCountriesPicker.tsx`: the chosen countries as pressed chips (select one again to take it off), "Add a country" with the markets not chosen yet (`hooks/useMarketCodes.ts`) and the line saying what hiding does. Used by the writer's `StoryWhereItShowsSection` (src/features/writing) and staff's `ClassicCountriesPanel` (src/features/staff).
- `components/UnavailableHereNotice.tsx`: board B11, "Sorry, this book isn't available in your country" (wording COUNTRY-2), shown by the story page and the reader when `hooks/useUnavailableHere.ts` (`api/unavailableHere.ts` → `story_unavailable_here()`) says the country is the only reason the story didn't open.
- `lib/hiddenCountries.ts`: adding and removing a country and the drop-down's choices.

Where the reader's country comes from: `src/lib/viewerCountry.ts` sends the signed country of the connection (from `/api/signup-context`) with every request; the database's `viewer_country()` checks it, and falls back to the member's own country without a good token. The rule itself sits in `reader_visible_story()` and `listed_stories()` (`supabase/migrations/…_country1_hide_in_countries.sql`), so every shelf, search, the Library and the reader follow it.
