import { stringify } from "./lib/stylis.ts";
import { compile, middleware } from "./lib/stylis.ts";
import { serialize } from "./lib/stylis.ts";
import { host } from "./lib/host.ts";

export const unnest = (css: string): string =>
  serialize(compile(css), middleware([host, stringify]));

export default unnest;
