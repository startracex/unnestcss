import {
  COMMA,
  COMMENT,
  DECLARATION,
  IMPORT,
  KEYFRAMES,
  LAYER,
  NAMESPACE,
  RULESET,
} from "./chars.ts";
import type { Middleware } from "./ast.ts";
import { isRuleset } from "./ast.ts";

export type SerializeCallback<T> = (
  element: T,
  index: number,
  children: T[],
  callback: SerializeCallback<T>,
) => string | void;

export const stringify: Middleware = (element, _index, _children, callback): string => {
  switch (element.type) {
    case LAYER:
      if (isRuleset(element) && element.children.length) {
        break;
      }
    // fallthrough for empty @layer
    case IMPORT:
    case NAMESPACE:
    case DECLARATION:
      return (element.return = element.return || element.value);
    case COMMENT:
      return "";
    case KEYFRAMES:
      if (isRuleset(element)) {
        element.return = `${element.value}{${serialize(element.children, callback)}}`;
        return element.return;
      }
      break;
    case RULESET:
      if (isRuleset(element)) {
        element.value = element.props.join(COMMA);
        if (element.value === "") {
          return "";
        }
      }
      break;
  }

  if (!isRuleset(element)) {
    return "";
  }

  const childrenStr = serialize(element.children, callback);
  if (childrenStr) {
    element.return = `${element.value}{${childrenStr}}`;
    return element.return;
  }
  return "";
};

export const serialize = <T>(children: T[], callback: SerializeCallback<T>): string =>
  children.reduce(
    (output, child, index) => output + (callback(child, index, children, callback) || ""),
    "",
  );
