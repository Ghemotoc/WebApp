# READ-4b plan: S1-E4-02 reading settings (#35)

- Migration `20261102110001_s1_e4_02_reading_settings.sql`: enums reading_font, reading_line_spacing,
  reading_line_width, reading_theme; table reading_settings (owner select only; kind user_action);
  save_reading_settings() (security definer, upsert, 42501 signed out).
- pgTAP 180 (allowed/denied, saves, device null size, range check, no direct write); 021 adds the table.
- Front end: api/readingSettings.ts, lib/readingStyle.ts (+ test), hooks/useReadingSettings.ts (cache + 600 ms save),
  hooks/useReadingLook.ts, components ReadingSettingsControl, ReadingSettingsPanel, TextSizeSlider; ChapterBar and
  ChapterReaderPage wired; CSS variables + .tmc-reading-page (sepia, night via data-theme).
- ChoiceChips gains isLabelEyebrow.
- e2e/reading-settings.spec.ts (5 tests). Docs: code-tour, retention, board-fixes, reading README.
