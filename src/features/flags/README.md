# Flags

The public feature flags (`invite_only`, `adults_only`, `social_login`, `maintenance_mode`) for screens that change with them. Built by S1-E2-01; the flags themselves are in `public.feature_flags` (S1-E1-02) and change by migration until S1-E11-03.

- `api/featureFlags.ts`: reads the flags marked public.
- `hooks/useFeatureFlags.ts`: `isOn(flagKey, safeDefault)`, cached for the visit. While loading, or if the read fails, it answers with the safe default the caller gives (the March value).

A flag on screen is a convenience: the database enforces each rule itself.
