// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Circle's browser wallet SDK (@circle-fin/w3s-pw-web-sdk) is dynamically imported
// in the browser during email login, but it pulls in Node-only dependencies
// (jsonwebtoken/jws/uuid) that import `buffer`/`stream`/`util`/`events`/`crypto`.
// Browsers have none of those, so Vite externalizes them (`stream.prototype` is
// undefined) and the flow crashed — first "reading 'from'", then "Object prototype
// may only be an Object or null" (util.inherits on an undefined Node stream).
//
// Map those bare builtin imports to browser polyfills, but ONLY in the CLIENT
// environment. This is done with a `resolveId` hook gated by `applyToEnvironment`
// (a per-environment hook) rather than a global `resolve.alias`, because a global
// alias leaks the browser shims into the SSR/server bundle and breaks server
// rendering ("util.TextEncoder is not a constructor"). `environments.client.resolve`
// is NOT honored by this wrapper, so the plugin approach is required.
const BROWSER_POLYFILLS: Record<string, string> = {
  buffer: "buffer",
  process: "process/browser",
  stream: "stream-browserify",
  events: "events",
  string_decoder: "string_decoder",
  crypto: "crypto-browserify",
  vm: "vm-browserify",
  // `util` -> shim that re-adds TextEncoder/TextDecoder (the plain polyfill omits them).
  util: fileURLToPath(new URL("./src/lib/polyfills/util-shim.ts", import.meta.url)),
};

function clientNodePolyfills(): Plugin {
  return {
    name: "jurix-client-node-polyfills",
    enforce: "pre",
    // Per-environment hook: only participate in the browser build. The SSR/server
    // build never sees these aliases, so it keeps using real Node modules.
    applyToEnvironment(environment) {
      return environment.name === "client";
    },
    async resolveId(source) {
      // Handle both bare (`stream`) and node:-prefixed (`node:string_decoder`) imports.
      const key = source.startsWith("node:") ? source.slice(5) : source;
      const replacement = BROWSER_POLYFILLS[key];
      if (!replacement) return null;
      const resolved = await this.resolve(replacement, undefined, { skipSelf: true });
      return resolved?.id ?? replacement;
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Deploy target: Vercel. Nitro emits the Vercel Build Output API (.vercel/output)
  // on production builds. Inside the Lovable editor sandbox this is ignored and the
  // build is forced back to Cloudflare automatically, so the editor preview is unaffected.
  //
  // maxDuration: AI judging fans out several model calls; the default serverless
  // timeout is far too short, so runs got killed mid-way and stuck on "judging".
  // 300s is the Vercel Pro ceiling. (Nitro writes this into the function's
  // .vc-config.json.)
  nitro: { preset: "vercel", vercel: { functions: { maxDuration: 300 } }, externals: { trace: false } } as any,
  vite: {
    plugins: [clientNodePolyfills()],
    // Dev only: don't esbuild-prebundle Circle's SDK, so its Node-builtin imports go
    // through the polyfill plugin above (esbuild prebundling would externalize them).
    // Ignored by the production build.
    optimizeDeps: {
      exclude: ["@circle-fin/w3s-pw-web-sdk"],
    },
  },
});
