# tags

Tags as one idea with a name in each language, the recommended tags, and the staff queue where
the moderation team approves, renames or rejects the tags writers add (CMS-1e; Robert's tag task,
30 Oct 2026). The tag box itself stays in `src/features/writing/components/TagInput.tsx`.

- `lib/tagCatalogue.ts`: shows a tag in the interface language and recognises a name typed in
  another language ("fantezie" is Fantasy in English), with the same rule as the database's
  `normalise_tag()`.
- `api/tagStore.ts`: the approved tags with their names (anyone), and `admin_list_tags()`,
  `admin_name_tag()` and `admin_reject_tag()` for staff.
- `hooks/useTagCatalogue.ts` (every screen that shows tags) and `hooks/useTagQueue.ts` (staff).
- `components/TagNames.tsx`: a story's tags as one line in the interface language.
- `components/staff/`: `TagsAdminPage.tsx` (/staff/tags and /staff/tags/missing),
  `TagDecisionRow.tsx` (a name per language, Approve or Save the names, Reject) and
  `RejectTagForm.tsx`.

The database half is `supabase/migrations/…_cms_1e_tags.sql`: a new name makes a waiting tag that
only its writer sees; readers, story pages and tag pages see approved tags only.
