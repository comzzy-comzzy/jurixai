// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Circle's browser wallet SDK (@circle-fin/w3s-pw-web-sdk) is dynamically imported
// in the browser during email login, but it pulls in Node-only dependencies
// (jsonwebtoken/jws/uuid) that import `buffer`/`stream`/`util`/`events`/`crypto`.
// Browsers have none of those, so Vite stubs them to undefined and the flow crashed
// (first "reading 'from'", then "Object prototype may only be an Object or null").
//
// Map those builtins to browser polyfills — but ONLY for the `client` environment.
// This is critical: applying them globally (e.g. via vite-plugin-node-polyfills)
// leaks the browser shims into the SSR/server bundle and breaks server rendering
// ("util.TextEncoder is not a constructor"). Environment-scoped aliases apply to the
// client build only, leaving the server bundle on real Node modules.
const clientResolveAlias = {
  buffer: "buffer",
  process: "process/browser",
  stream: "stream-browserify",
  events: "events",
  string_decoder: "string_decoder",
  crypto: "crypto-browserify",
  vm: "vm-browserify",
  // `util` goes through a shim that re-adds TextEncoder/TextDecoder (the plain
  // polyfill omits them). Matched exactly so the shim's own `util/` import resolves
  // to the real polyfill instead of recursing.
  util: fileURLToPath(new URL("./src/lib/polyfills/util-shim.ts", import.meta.url)),
};

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
    environments: {
      client: {
        resolve: {
          alias: clientResolveAlias,
        },
      },
    },
  },
});
