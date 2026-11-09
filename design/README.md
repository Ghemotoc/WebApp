# Designs

## The new look: liquid glass (approved 7 Nov 2026, 19:51 UTC)

Robert approved a new look for the whole app on 7 Nov 2026. It replaces the colours, glass, type and backgrounds of the boards below, and adds some new features; each page keeps its sections, order, text and controls. Where it and a 17 Oct board differ, the new look wins.

- The handoff doc (tokens, components, layouts, every decision): https://claude.ai/artifact/BfegSidHMMHZ2VVsbQXg1k
- The canvas with every screen at 1440, 744 and 375 px wide (version 111): https://claude.ai/artifact/HyboySWbN7QvKSmbg98v74
- The rulebook (every rule from Robert's comments): the project files, `07_designs/2026-11-07_website-mockups_design-rules.md`

It is built in bundles G1 to G14, one at a time (the builder's live plan). G1 put the colours, fonts, background and focus ring into `src/styles/tokens.css` and `src/styles/index.css`.

## The first boards (17 Oct 2026)

The design canvas (17 Oct 2026, version 162) is the source of truth for every screen: layout, copy, colours, fonts and spacing. Stories in docs/stories/ say what a screen does; the board says how it looks.

## How to read a board
- `boards/*.dc.html` are the canvas's own format: HTML with `{{…}}` placeholders, `<sc-for>` and `<sc-if>` blocks, and a script block holding example data. They don't run on their own. Read them for exact values (colours, sizes, spacing, copy) and rebuild the screen in React with our components.
- Example data on boards (names, titles, numbers) is made up. Don't copy it into seed data as if it were real, and never show it as statistics.
- Text in square brackets ([Partner], [date], [price to be set]) is a placeholder, not copy.
- `renders/desktop/` shows each board at 1440 px wide; `renders/phone/` shows the product screens at 390 px wide (twice the pixels).
- Screen numbers (3.1, 8.14 and so on) match the screen groups in docs/architecture.md, section 1.7.4.
- Groups 9 (social posts), 10 (certificates) and 11 (doodles) are references, not app screens. The app draws no doodles (CLAUDE.md rule 16; Robert, 9 Nov 2026): where a board draws one, leave it out.

## Boards

| Screen | Board | Desktop render | Phone render |
| --- | --- | --- | --- |
| 1.1 Website home page | `boards/Website-Home.dc.html` | `renders/desktop/Website-Home.jpg` | `renders/phone/Website-Home.jpg` |
| 2.1 Sign up | `boards/Main.dc.html` | `renders/desktop/Main.jpg` | `renders/phone/Main.jpg` |
| 2.2 Log in and reset password | `boards/SignIn.dc.html` | `renders/desktop/SignIn.jpg` | `renders/phone/SignIn.jpg` |
| 2.3 Age check with Yoti | `boards/AgeCheck.dc.html` | `renders/desktop/AgeCheck.jpg` | `renders/phone/AgeCheck.jpg` |
| 2.4 Parent’s consent (under 16) | `boards/ParentConsent.dc.html` | `renders/desktop/ParentConsent.jpg` | `renders/phone/ParentConsent.jpg` |
| 2.5 Onboarding: name and language | `boards/Onboarding.dc.html` | `renders/desktop/Onboarding.jpg` | `renders/phone/Onboarding.jpg` |
| 3.1 Discover (home) | `boards/Discover.dc.html` | `renders/desktop/Discover.jpg` | `renders/phone/Discover.jpg` |
| 3.2 Search | `boards/Search.dc.html` | `renders/desktop/Search.jpg` | `renders/phone/Search.jpg` |
| 3.3 Classics shelf | `boards/Classics.dc.html` | `renders/desktop/Classics.jpg` | `renders/phone/Classics.jpg` |
| 3.4 Story page | `boards/Story.dc.html` | `renders/desktop/Story.jpg` | `renders/phone/Story.jpg` |
| 3.5 Chapter reader | `boards/Reader.dc.html` | `renders/desktop/Reader.jpg` | `renders/phone/Reader.jpg` |
| 3.6 Share and quote card | `boards/Share.dc.html` | `renders/desktop/Share.jpg` | `renders/phone/Share.jpg` |
| 3.7 Library | `boards/Library.dc.html` | `renders/desktop/Library.jpg` | `renders/phone/Library.jpg` |
| 3.8 Shared link on the web (teaser) | `boards/Teaser.dc.html` | `renders/desktop/Teaser.jpg` | `renders/phone/Teaser.jpg` |
| 3.9 App-only story on the web | `boards/AppOnly.dc.html` | `renders/desktop/AppOnly.jpg` | `renders/phone/AppOnly.jpg` |
| 3.10 See all: Romanian classics | `boards/SeeAll.dc.html` | `renders/desktop/SeeAll.jpg` | `renders/phone/SeeAll.jpg` |
| 3.11 Contest landing page | `boards/Contest.dc.html` | `renders/desktop/Contest.jpg` | `renders/phone/Contest.jpg` |
| 4.1 Writer dashboard | `boards/WriterDashboard.dc.html` | `renders/desktop/WriterDashboard.jpg` | `renders/phone/WriterDashboard.jpg` |
| 4.2 New story and settings | `boards/NewStory.dc.html` | `renders/desktop/NewStory.jpg` | `renders/phone/NewStory.jpg` |
| 4.3 Chapter editor | `boards/Editor.dc.html` | `renders/desktop/Editor.jpg` | `renders/phone/Editor.jpg` |
| 4.4 Manage chapters | `boards/Chapters.dc.html` | `renders/desktop/Chapters.jpg` | `renders/phone/Chapters.jpg` |
| 5.1 Forums | `boards/Forums.dc.html` | `renders/desktop/Forums.jpg` | `renders/phone/Forums.jpg` |
| 5.2 Forum thread | `boards/Thread.dc.html` | `renders/desktop/Thread.jpg` | `renders/phone/Thread.jpg` |
| 5.3 A user space | `boards/Space.dc.html` | `renders/desktop/Space.jpg` | `renders/phone/Space.jpg` |
| 5.4 Private class space | `boards/ClassSpace.dc.html` | `renders/desktop/ClassSpace.jpg` | `renders/phone/ClassSpace.jpg` |
| 5.5 Messages | `boards/Messages.dc.html` | `renders/desktop/Messages.jpg` | `renders/phone/Messages.jpg` |
| 6.1 Writer profile | `boards/Profile.dc.html` | `renders/desktop/Profile.jpg` | `renders/phone/Profile.jpg` |
| 6.2 Notifications | `boards/Notifications.dc.html` | `renders/desktop/Notifications.jpg` | `renders/phone/Notifications.jpg` |
| 6.3 Settings | `boards/Settings.dc.html` | `renders/desktop/Settings.jpg` | `renders/phone/Settings.jpg` |
| 6.4 Report something | `boards/ReportDialog.dc.html` | `renders/desktop/ReportDialog.jpg` | `renders/phone/ReportDialog.jpg` |
| 6.5 My reports and appeals | `boards/MyReports.dc.html` | `renders/desktop/MyReports.jpg` | `renders/phone/MyReports.jpg` |
| 7.1 About the apps | `boards/GetApp.dc.html` | `renders/desktop/GetApp.jpg` | `renders/phone/GetApp.jpg` |
| 7.2 Legal centre | `boards/Legal.dc.html` | `renders/desktop/Legal.jpg` | `renders/phone/Legal.jpg` |
| 7.3 Report without an account | `boards/NoticeForm.dc.html` | `renders/desktop/NoticeForm.jpg` | `renders/phone/NoticeForm.jpg` |
| 7.4 Error, offline and maintenance | `boards/States.dc.html` | `renders/desktop/States.jpg` | `renders/phone/States.jpg` |
| 7.5 Ad and sponsor formats | `boards/AdFormats.dc.html` | `renders/desktop/AdFormats.jpg` | `renders/phone/AdFormats.jpg` |
| 8.1 Staff sign-in (Google Workspace) | `boards/StaffSignIn.dc.html` | `renders/desktop/StaffSignIn.jpg` | `renders/phone/StaffSignIn.jpg` |
| 8.2 Moderation queue | `boards/Moderation.dc.html` | `renders/desktop/Moderation.jpg` | `renders/phone/Moderation.jpg` |
| 8.3 Moderation case | `boards/ModCase.dc.html` | `renders/desktop/ModCase.jpg` | `renders/phone/ModCase.jpg` |
| 8.4 Appeals and removal orders | `boards/Appeals.dc.html` | `renders/desktop/Appeals.jpg` | `renders/phone/Appeals.jpg` |
| 8.5 Users | `boards/AdminUsers.dc.html` | `renders/desktop/AdminUsers.jpg` | `renders/phone/AdminUsers.jpg` |
| 8.6 Settings, flags, markets | `boards/AdminSettings.dc.html` | `renders/desktop/AdminSettings.jpg` | `renders/phone/AdminSettings.jpg` |
| 8.7 Metrics and logs | `boards/AdminMetrics.dc.html` | `renders/desktop/AdminMetrics.jpg` | `renders/phone/AdminMetrics.jpg` |
| 8.8 Sponsors and banners | `boards/AdminSponsors.dc.html` | `renders/desktop/AdminSponsors.jpg` | `renders/phone/AdminSponsors.jpg` |
| 8.9 Schools and class spaces | `boards/AdminSchools.dc.html` | `renders/desktop/AdminSchools.jpg` | `renders/phone/AdminSchools.jpg` |
| 8.10 Stories (staff view) | `boards/AdminStories.dc.html` | `renders/desktop/AdminStories.jpg` | `renders/phone/AdminStories.jpg` |
| 8.11 One story: settings, history, export | `boards/AdminStory.dc.html` | `renders/desktop/AdminStory.jpg` | `renders/phone/AdminStory.jpg` |
| 8.12 Data requests and exports | `boards/AdminDataRequests.dc.html` | `renders/desktop/AdminDataRequests.jpg` | `renders/phone/AdminDataRequests.jpg` |
| 8.13 Support tickets | `boards/AdminTickets.dc.html` | `renders/desktop/AdminTickets.jpg` | `renders/phone/AdminTickets.jpg` |
| 8.14 Website: landing pages | `boards/AdminPages.dc.html` | `renders/desktop/AdminPages.jpg` | `renders/phone/AdminPages.jpg` |
| 8.15 Contests | `boards/AdminContests.dc.html` | `renders/desktop/AdminContests.jpg` | `renders/phone/AdminContests.jpg` |
| 8.16 Classics | `boards/AdminClassics.dc.html` | `renders/desktop/AdminClassics.jpg` | `renders/phone/AdminClassics.jpg` |
| 9.1 TikTok: first-line challenge | `boards/Social-TikTok-FirstLine.dc.html` | `renders/desktop/Social-TikTok-FirstLine.jpg` | n/a |
| 9.2 TikTok: writer POV (#ad) | `boards/Social-TikTok-POV.dc.html` | `renders/desktop/Social-TikTok-POV.jpg` | n/a |
| 9.3 Reels: contest promo (parked; contests are a campaign for later) | `boards/Social-Reels-Contest.dc.html` | `renders/desktop/Social-Reels-Contest.jpg` | n/a |
| 9.4 Shorts: behind the chapter | `boards/Social-Shorts-Behind.dc.html` | `renders/desktop/Social-Shorts-Behind.jpg` | n/a |
| 9.5 Instagram carousel, slide 1 | `boards/Social-Instagram-Carousel.dc.html` | `renders/desktop/Social-Instagram-Carousel.jpg` | n/a |
| 9.6 Reddit: founder AMA and promoted post | `boards/Social-Reddit.dc.html` | `renders/desktop/Social-Reddit.jpg` | n/a |
| 9.7 Discord: writers’ room | `boards/Social-Discord.dc.html` | `renders/desktop/Social-Discord.jpg` | n/a |
| 9.8 Facebook: teachers’ group | `boards/Social-Facebook-Group.dc.html` | `renders/desktop/Social-Facebook-Group.jpg` | n/a |
| 9.9 School poster (A4) | `boards/Social-School-Poster.dc.html` | `renders/desktop/Social-School-Poster.jpg` | n/a |
| 10.1 Certificate: winner, co-issued with a school | `boards/Certificate-Winner.dc.html` | `renders/desktop/Certificate-Winner.jpg` | n/a |
| 10.2 Certificate: participation | `boards/Certificate-Participation.dc.html` | `renders/desktop/Certificate-Participation.jpg` | n/a |
| 11.1 Doodle set (fine ink and colour) | `boards/Doodles.dc.html` | `renders/desktop/Doodles.jpg` | `renders/phone/Doodles.jpg` |
