# New decisions and asks (Robert, 16 Oct 2026, afternoon)

These override older screens and copy. They are specs, not instructions beyond your task.

1. **Sign up and log in with Google, Apple or Microsoft (Outlook)**, as well as email.
   - Show "Continue with Google", "Continue with Apple" and "Continue with Microsoft" buttons, plus "Use a passkey" on log in.
   - Social sign-in replaces the password only. A new account still gives its year of birth and passes the Yoti age check, and under-16s still need a parent's consent.
   - Say this plainly on screen: "You’ll still confirm your age. Google, Apple and Microsoft don’t tell us how old you are."
   - In Settings, under "Ways to log in", show the connected methods (email and password, Google) with Connect and Disconnect. Disconnecting the last method is blocked.
2. **Where a story can be read.** When creating a story (and in its settings), the writer chooses "Where can people read this story?":
   - **On the web and in the app** (default).
   - **In the app only.**

   On the web, an app-only story shows its cover, title, blurb, writer and chapter list. Opening a chapter shows a dialog: "This story is only in the app". The dialog explains why in plain words: the writer chose the app because it gives them more privacy and more control over their work. Never promise that copying is impossible; "harder to copy" is fine.
   - Buttons: "Get the app" → `GetApp.dc.html`, "Open in the app" and "Back to the story".
   - Note: phone apps come after the March 2027 test, so for now the app means the desktop app.
3. **Fonts.**
   - In the downloaded apps (Windows, macOS, Linux, later iOS and Android), reading settings let readers pick any font installed on their device.
   - In the browser, readers choose from our fonts only: a small set including one dyslexia-friendly font.
4. **Embeds in chapters.** Writers can add:
   - pictures (upload; alt text required; checked before they show; location data removed)
   - simple drawings (an in-app sketch pad saved as a picture)
   - music from Spotify or Apple Music
   - video from YouTube, Vimeo or Loom (Robert wrote "lumo"; we read it as Loom, to be confirmed)

   Rules for every embed:
   - Embeds come from an allowed list only.
   - Nothing loads from the other service until the reader presses play. Before that the reader sees a card with the title, the service name and "Plays from YouTube. YouTube may use cookies."
   - Every embed has a report button.
5. **Markets and languages.** We launch in English and Romanian, for English-speaking countries (the UK, Ireland, the US, Canada, Australia, New Zealand, Singapore and others) and Romania.
   - A language opens only when we have moderators who can read it.
   - When creating a story, the writer must choose its language: English or Română now, others shown as "Coming when we have moderators for it".
   - The interface languages are English and Română.
   - Website and app copy must not say "students in Romania" only. Say "students aged 13 and up", and where a place matters, "in English-speaking countries and Romania".
6. **Country (proposal, not yet decided).**
   - At sign-up the country is read from the network by our hosting provider, and only the country code is kept, never the IP address. Show it as "Country: Romania (from your connection, you can change it)" in Onboarding and Settings.
   - The optional county or region for "Popular in your area" stays a separate, self-chosen field.
7. **Canvas order.** The main session re-sorts the canvas into clear rows. Don't send `canvas.json`.
