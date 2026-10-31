# ATLAS-b plan: characters (S1-E17-08 to 11, 13)

- Migrations: `…110001_s1_e17_08_enums.sql` (picture_kind atlas_image), `…110002_s1_e17_08_characters.sql` (story_characters, story_character_fields, atlas-images bucket and policies, functions, story_plan() with the cast count).
- Policies: story_characters_select_own, story_character_fields_select_own, atlas_images_insert_own, atlas_images_select_uploader_and_staff, atlas_images_delete_own; allowed and denied tests in 191.
- Screens: /plan/s/:slug/characters/:id?; section nav; cast card and own-fields card on at-a-glance.
- S1-E17-12 (appears in, mentioned in) waits for parts e and h; relationships cascade arrives in part c.
