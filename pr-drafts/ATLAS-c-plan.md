# ATLAS-c plan: relationships, the map and the family tree (S1-E17-14 to S1-E17-16)

- Migration `20261104120001_s1_e17_14_relationships.sql`: `story_character_relationships` (from, to, kind of 13, custom label, note), policy `story_character_relationships_select_own`, `add_character_relationship()`, `delete_character_relationship()`, `story_cast()` with `relationships`.
- pgTAP `192-character-relationships`: allowed and denied for the policy, every check, the cascade on character delete.
- Screens: `CharacterRelationshipsSection` on each sheet (S1-E17-14), `/plan/s/:slug/connections` with `AddRelationshipForm`, `RelationshipMap` (S1-E17-15), `FamilyTreeView` (S1-E17-16) and `RelationshipList`.
- Libs with unit tests: `relationshipCategories`, `relationshipMap`, `familyTree`, `familyTreeLayout`.
- Line colours as tokens (`--atlas-line-*`) with 3:1 contrast pairs.
- e2e `atlas-connections.spec.ts`: every acceptance criterion, plus axe at 390, 768 and 1440, light and night, ro and en.
