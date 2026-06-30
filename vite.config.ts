// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Circle's browser wallet SDK (@circle-fin/w3s-pw-web-sdk) is dynamically imported
// in the browser, but its dependencies (jsonwebtoken/jws/uuid) reach for Node core
// modules — `buffer` (Buffer.from), and `stream`/`util`/`events`/`crypto` (used via
// util.inherits on Node streams). Browsers have none of these, so Vite stubs them to
// undefined and email login crashed (first "reading 'from'", then "Object prototype
// may only be an Object or null"). Polyfill exactly the builtins those deps need.
//
// IMPORTANT: `protocolImports: false` keeps `node:`-prefixed imports (e.g.
// `node:module`, `node:crypto`) untouched, and we deliberately do NOT include
// `module`/`fs`. That protects the SSR/server build (which imports `createRequire`
// from `node:module` and uses real Node crypto for sessions/Supabase/Circle server
// SDK) — only bare browser imports get the polyfill.
const nodeBuiltinPolyfills = nodePolyfills({
  include: ["buffer", "crypto", "stream", "util", "events", "string_decoder", "process", "vm"],
  globals: { Buffer: true, global: true, process: true },
  protocolImports: false,
});

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Deploy target: Vercel. Nitro emits the Vercel Build Output API (.vercel/output)
  // on production builds. Inside the Lovable editor sandbox this is ignored and the
  // build is forced back to Cloudflare automatically, so the editor preview is unaffected.
  nitro: { preset: "vercel" },
  vite: {
    plugins: [nodeBuiltinPolyfills],
  },
});
