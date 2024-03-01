import { isSupport } from "./is-support.js";
import { Parser } from "./parser.js";

function unnest(cssText: string, keepNesting = isSupport()): string {
  if (keepNesting) {
    return cssText;
  }
  const un = new Parser(cssText);
  un.parse();
  un.unnest();
  return un.css;
}

export { unnest, isSupport, Parser };
export default unnest;
