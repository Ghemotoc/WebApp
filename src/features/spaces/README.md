# spaces

Spaces people create and run: a list of spaces, one space's page with its threads, rules and
owner, creating a space and changing its settings, joining and leaving, and the owner's
requests to approve (bundle FORUMS-2, part a; story S1-E8-06; design/boards/Space.dc.html), and
the moderators who help run a space, its members page and its moderation log (part b; S1-E8-07),
and banner pictures and the join notifications (part c).
Each space owns one hidden forum, so its threads reuse the forums feature (`ThreadList`,
`NewThreadForm`, `ThreadPage`).

- `api/spaces.ts`: `space_list()`, `space_page()`, `space_name_available()`, `create_space()`,
  `update_space()`, `join_space()`, `leave_space()`, `space_join_requests()`,
  `decide_space_join_request()` and `my_space_age_group()`, with refusals as `SpaceError`.
- `hooks/useSpaces.ts`: the reads and changes; `hooks/useSpaceNameCheck.ts`: the name check as
  the owner types.
- `lib/spaceLook.ts`: the four drawn banners and the badge's letters; `lib/spaceFailures.ts`:
  which words a refusal gets.
- `components/SpacesPage.tsx` (`/spaces`) with `SpaceRow`; `SpacesCard` on the forum index.
- `components/SpacePage.tsx` (`/spaces/:spaceSlug`): `SpaceBreadcrumb`, `SpaceHeaderCard`
  (`SpaceBadge`, `SpacePills`, `SpaceJoinActions`, Report), the forums' `ThreadList`,
  `SpaceRequestsCard`, `SpaceRulesCard` and `SpaceRunsCard`.
- `components/NewSpacePage.tsx` (`/spaces/new`) and `SpaceSettingsPage.tsx`
  (`/spaces/:spaceSlug/settings`), both with `SpaceFormCard` and `SpaceForm` (`SpaceNameField`,
  `SpaceBannerChoice`, `SpaceRadioGroup`).
- `components/SpaceNewThreadPage.tsx` (`/spaces/:spaceSlug/new`): the forums' `NewThreadForm` on
  the space's forum.
- `api/spaceModeration.ts` and `hooks/useSpaceModeration.ts` (part b): `space_moderators()`,
  `space_member_list()`, `space_log()`, `set_space_moderator()` and `remove_space_member()`;
  `lib/spacePowers.ts` and `lib/spaceLogText.ts` for the powers' order and the log's words.
- `components/SpaceModeratorsCard.tsx` on the settings page (`SpaceModeratorRow`,
  `SpaceAddModerator`, `SpacePowerChoices`); `SpaceToolLinks` on the header;
  `SpaceMembersPage.tsx` (`/spaces/:spaceSlug/members`, with `SpaceMemberRow`) and
  `SpaceLogPage.tsx` (`/spaces/:spaceSlug/log`, with `SpaceLogLine`).
- `api/spaceBanner.ts` and `hooks/useSpaceBanner.ts` (part c): choosing an uploaded banner or the
  colour (`set_space_banner_picture()`) and the picture's signed address; `SpaceBannerBand` on the
  header and `SpaceBannerPictureCard` on the settings page. The join notifications are written by
  a database trigger and worded in the notifications feature.
- `api/classSpaces.ts` and `hooks/useClassSpaces.ts` (bundle CLASSES, part a; S1-E8-11): a
  class space's invite code (`make_class_invite()`, `end_class_invite()`, `class_invite()`) and
  joining with it (`class_invite_preview()`, `join_class_space()`); `ClassInviteCard` (with
  `ClassInviteFields` and `NewClassInviteCode`) on the settings page and `JoinClassPage`
  (`/class/:code`).
- `api/classTools.ts` and `hooks/useClassTools.ts` (bundle CLASSES, part b; S1-E8-11): starting
  a class space from the new space form (`create_class_space()`), its lock at the end of the
  school year (`set_class_lock()`) and the members still waiting to read
  (`class_waiting_members()`); `ClassLockCard` and `ClassWaitingCard` on the settings page,
  `ClassAboutCard` beside a class's threads and `ClassCodeForm` on `/class`.
- `api/classStories.ts` and `hooks/useClassStories.ts` (bundle CLASSES, part c; S1-E8-11):
  sharing a story only with a class (`story_class_share()`, `set_story_class()`) and the class's
  list (`class_space_stories()`); `StoryClassCard` in Story settings, `ClassStoriesCard` on the
  class page and `ClassStoriesPage` at `/spaces/<slug>/stories`.
- `archiveClassSpace()` in `api/classTools.ts` and `useArchiveClass()` (bundle CLASSES, part d):
  archiving a class for good; `ClassArchiveCard` in the class's settings. Staff set up pilot
  classes from `src/features/staff/components/schools/ClassSpacesPage.tsx`.
