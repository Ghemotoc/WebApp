> Source: CTO pack, fact-checked 17 Oct 2026. The master plan's Decisions made tab wins if they differ.

#### S1-E15 Analytics and the March test

**Back end and build order:** section 1.7, group H (screen 8.7), wave 5.

##### S1-E15-01 Cookieless product analytics

As the founder, I want simple usage numbers without cookies so that I learn what works without tracking anyone.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E1-01
- **Acceptance criteria:**
  - Given the analytics tool, when it is installed, then it uses no cookies, stores no user IDs and is hosted in the EU.
  - Given any event, when it is sent, then it is on the event catalogue and carries no personal data.
- **Legal and compliance:** recommendation (Q49, pending Robert): Plausible or Umami Cloud, both cookieless and hosted in the EU. Choice OPEN. Moves after the March MVP (section 1.13).

##### S1-E15-02 First-party metrics for the March test

As the founder, I want the March test numbers calculated from our own database so that I know whether Stage 1 works.

- **Priority:** Must · **Size:** M · **Depends on:** S1-E4-01 (daily `chapter_reads` totals), S1-E3-03; S1-E4-03 once it lands (it moved after March, section 1.13)
- **Acceptance criteria:**
  - Given the metrics job, when it runs daily, then it reports writers with at least one published chapter (in total and by open market), signed-up readers and the return rate.
  - Given the return rate definition, when it is calculated, then it is the share of readers of chapter N who open chapter N+1 within 14 days of its release (definition is my proposal).
  - Given any metric, when it is stored, then it is aggregated; no individual-level export exists.
- **Legal and compliance:** decided 16 Oct 2026: the target is 20 writers publishing, from any open market. The 200 readers and 30% return targets are still proposals, not final.

##### S1-E15-03 Event catalogue

As a developer, I want one list of analytics events so that tracking stays consistent and private.

- **Priority:** Must · **Size:** S · **Depends on:** S1-E15-01
- **Acceptance criteria:**
  - Given `docs/analytics-events.md`, when an event is added, then it has an `object_action` name, its properties and where it fires.
  - Given the code, when CI runs, then any event name not in the catalogue fails the build.
- **Legal and compliance:** keeps personal data out of analytics.

---
