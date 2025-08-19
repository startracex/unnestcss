import type { COMMENT, DECLARATION, IMPORT, KEYFRAMES, LAYER, NAMESPACE, RULESET } from "./enum.ts";

export type Element = {
  parent: Element | null;
  root: Element | null;
  value: string;
  length: number;
  return: string;
  line: number;
  column: number;
  siblings: Element[];
} & (
  | {
      type: typeof COMMENT | typeof DECLARATION;
      children: string;
      props: string;
    }
  | {
      type: typeof RULESET | typeof KEYFRAMES | typeof LAYER;
      children: Element[];
      props: string[];
    }
  | {
      type: typeof IMPORT | typeof NAMESPACE;
      children: [];
      props: [];
    }
);

export type Middleware = (
  element: Element,
  index: number,
  children: Element[],
  callback: Middleware,
) => string | void;

export default {};
