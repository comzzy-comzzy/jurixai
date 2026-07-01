/**
 * Client-only `util` shim.
 *
 * The npm `util` browser polyfill provides `inherits`, `inspect`, `types`, etc.
 * (which Circle's wallet SDK deps need via `util.inherits` on Node streams), but
 * it omits `TextEncoder`/`TextDecoder`. Some libraries read those off `util`, and
 * a missing `util.TextEncoder` is exactly what broke SSR earlier. In the browser
 * `TextEncoder`/`TextDecoder` are globals, so re-expose them here.
 *
 * The `util/` specifier (with trailing slash) does NOT match the exact `^util$`
 * alias, so it resolves to the real npm polyfill and avoids recursion.
 */
// @ts-expect-error - the npm `util` polyfill ships without bundled types
import util from "util/";

const g = globalThis as unknown as {
  TextEncoder: typeof TextEncoder;
  TextDecoder: typeof TextDecoder;
};

const base = (util ?? {}) as Record<string, unknown>;

const shim: Record<string, unknown> = {
  ...base,
  TextEncoder: g.TextEncoder,
  TextDecoder: g.TextDecoder,
};

export default shim;

// Named re-exports so `import { inherits } from "util"` keeps working.
export const inherits = base.inherits as (ctor: unknown, superCtor: unknown) => void;
export const inspect = base.inspect as unknown;
export const format = base.format as unknown;
export const promisify = base.promisify as unknown;
export const types = base.types as unknown;
export const deprecate = base.deprecate as unknown;
export const TextEncoder = g.TextEncoder;
export const TextDecoder = g.TextDecoder;
