/*
 * zod's settings, read before the app starts (QA-1c, finding X1).
 *
 * Who loads it: index.html, as a plain script before src/main.tsx, so it runs before any app code
 * builds a schema. zod reads its settings from globalThis.__zod_globalConfig when a schema is
 * built (node_modules/zod/v4/core/core.js), which is why z.config() inside the app is too late.
 * What it does: "jitless" stops zod from trying `new Function("")` to compile its checks. The
 * Content Security Policy refuses eval (server/security-headers.ts), so the attempt only failed
 * and was reported as a violation; zod checks the same way without it.
 */
globalThis.__zod_globalConfig = Object.assign(globalThis.__zod_globalConfig || {}, {
  jitless: true,
});
