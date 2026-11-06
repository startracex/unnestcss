import { compile, middleware, serialize, stringify } from "./lib/css.ts";
import { host } from "./lib/host.ts";

export const unnest = (css: string): string =>
  serialize(compile(css), middleware([host, stringify]));

export default unnest;
