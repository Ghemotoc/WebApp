# Analytics events

Every analytics event the app sends, named `object_action` (CLAUDE.md conventions). Events carry no personal data: no user ID, email, IP address, handle or user text (CLAUDE.md rules 7 and 12; Definition of Done, Analytics).

Created by S1-E1-04. The March numbers come from our own database (S1-E15-02); the cookieless analytics tool (S1-E15-01, Q49 OPEN) comes after March, so **no events are sent yet**. A story that adds an event adds its row here in the same pull request.

| Event | Fires when | Properties | Story |
| --- | --- | --- | --- |
| (none yet) | | | |

Candidates noted for when the tool exists, not built: `language_changed` with the new language code only (S1-E1-04); `sign_up_completed` with no properties and `sign_up_refused` with the reason only (`no_invite`, `password_too_short`, `password_leaked`) (S1-E2-01). The March sign-up numbers come from the database instead (S1-E15-02). `story_created` with the category only (S1-E3-01).
