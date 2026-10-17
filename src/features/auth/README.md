# Auth

Who is signed in, and (from S1-E2-01 and S1-E2-05) signing up, confirming the email and signing in. Started by S1-E14-01.

- `hooks/useSession.ts`: follows the signed-in person through Supabase Auth; answers their user ID (for data caches only, never shown on screen) and whether the first answer has arrived. Without Supabase settings it answers "signed out".
