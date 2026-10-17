> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E16 Platforms and app stores

**Back end and build order:** section 1.7, group G (7.1) and piece B33, from wave 2.

Decided: all operating systems ship in Stage 1 (Chat). Desktop with Tauri 2 is the plan's route (master-plan/01), not a logged decision. How iOS and Android are built is decided with a programmer at that point (16 Oct 2026, late evening, Q40). The March MVP is web only (decided 17 Oct 2026, 34o).

##### S1-E16-01 Installable web app

As a reader without the app, I want to install the web app on my phone so that it feels like an app.

- **Priority:** Should · **Size:** M · **Depends on:** S1-E1-03
- **Acceptance criteria:**
  - Given a supported browser, when the user chooses "Add to home screen", then the app installs with its icon and opens full screen.
  - Given the installed web app, when it is offline, then the shell loads and shows the offline state.
- **Legal and compliance:** none beyond the global checklist.

##### S1-E16-02 Desktop apps for Windows, macOS and Linux

As a reader on a computer, I want a desktop app so that I can read with stronger copy protection.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E4-01
- **Acceptance criteria:**
  - Given a tagged release, when GitHub Actions runs, then it builds Windows, macOS (on a macOS runner) and Linux (AppImage and .deb) apps from the web code using Tauri 2.
  - Given the macOS and Windows builds, when they are installed, then they show no "unknown developer" warning (Apple notarisation, Windows code signing).
  - Given a new version, when it is released, then installed apps update through Tauri's signed updater.
  - Given the desktop app, when it is built, then it includes the deep link (custom scheme), opener and single-instance plugins used by the age check (S1-E2-08) and "Open in the app" (S1-E4-09), all called through the `platform` adapter (section 1.7.5).
- **Legal and compliance:** Apple Developer Program (USD 99 a year) and a Windows signing certificate, ideally in the company's name.

##### S1-E16-03 iOS and Android apps with deep links

As a phone user, I want a proper app from the App Store or Google Play so that reading and notifications work well.

- **Priority:** Must · **Size:** L · **Depends on:** S1-E16-01
- **Acceptance criteria:**
  - Given the chosen wrapper, when the app is built, then iOS and Android apps run the same code as the web app with push notifications, deep links and the capture rules in S1-E4-06.
  - Given a shared chapter link, when it is tapped on a phone with the app installed, then the chapter opens in the app; without it, the web teaser opens with an install prompt.
  - Given Apple's minimum functionality rule, when the app is reviewed, then it offers native value (push, offline or capture protection), not just a web page in a frame.
- **Legal and compliance:** wrapper choice is OPEN until a programmer joins (Q40; Capacitor, Tauri 2 mobile or Expo; see the CTO pack). The apps use each platform's screen-capture protection (S1-E4-06).

##### S1-E16-04 App store compliance pack

As the founder, I want everything the stores check ready before submission so that the apps aren't rejected.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E10-01, S1-E9-02, S1-E13-03, S1-E14-02
- **Acceptance criteria:**
  - Given the iOS submission, when it is prepared, then it shows content filtering, reporting, blocking, published contact details, in-app account deletion, a 13+ (or higher) age rating, a privacy label that matches the SDKs used and a reviewer demo account.
  - Given the Google Play submission, when it is prepared, then the content rating questionnaire, data safety form and account deletion web link are complete.
  - Given any iOS storefront where link-outs are not allowed, when the app runs, then it shows no link or button to buy anything outside the app.
- **Legal and compliance:** Apple 1.2, 3.1.1 and 5.1.1(v) (5.1.1(v): check before relying on it); Google Play user-content and account deletion policies. A new personal Google Play developer account must run a closed test (currently 12 testers for 14 days) before production; an organisation account needs the company (SRL or AB: OPEN, Q55) and a D-U-N-S number. Check both rules when the accounts are opened.
