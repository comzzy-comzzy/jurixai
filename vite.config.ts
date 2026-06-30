// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Circle's browser wallet SDK (@circle-fin/w3s-pw-web-sdk) is dynamically imported
// in the browser, but its dependencies (jsonwebtoken/uuid) `import { Buffer } from
// "buffer"`. The browser has no `buffer` module, so Vite stubs it to undefined and
// `Buffer.from(...)` threw "Cannot read properties of undefined (reading 'from')"
// during email login. Polyfill ONLY the `buffer` module + Buffer global. Scoped to
// just `buffer` on purpose: polyfilling all Node builtins (the plugin default)
// rewrites `node:module`/`node:crypto` and breaks the SSR/server build, whereas the
// `buffer` polyfill works in both the browser and on Node, so it is safe everywhere.
const bufferPolyfill = nodePolyfills({
  include: ["buffer"],
  globals: { Buffer: true, global: true, process: false },
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
    plugins: [bufferPolyfill],
  },
});
