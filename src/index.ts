import { isSupport } from "./is-support.js";
import { Parser } from "./parser.js";

function unnest(cssText: string, keepNesting = isSupport()) {
  if (keepNesting) {
    return cssText;
  }
  const un = new Parser(cssText);
  return un.unnest(un.parse());
}

export { unnest, isSupport };
export default unnest;
