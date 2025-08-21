import { IMPORT, LAYER, COMMENT, RULESET, DECLARATION, KEYFRAMES, NAMESPACE } from "./enum.ts";
import type { Element, Middleware } from "./types.ts";

export const stringify = (
  element: Element,
  _index: number,
  children: Element[],
  callback: Middleware,
): string => {
  switch (element.type) {
    case LAYER:
      if (element.children.length) {
        break;
      }
    case IMPORT:
    case NAMESPACE:
    case DECLARATION:
      return (element.return = element.return || element.value);
    case COMMENT:
      return "";
    case KEYFRAMES:
      element.return = `${element.value}{${serialize(element.children, callback)}}`;
      return element.return;
    case RULESET:
      element.value = element.props.join(",");
      if (element.value === "") {
        return "";
      }
  }

  children = serialize(element.children, callback) as any;

  if (children) {
    element.return = `${element.value}{${children}}`;
    return element.return;
  }
  return "";
};

type SerializeCallback<T, R> = (
  element: T,
  index: number,
  children: T[],
  callback: SerializeCallback<T, R>,
) => R;

export const serialize = <T, F>(children: T[], callback: SerializeCallback<T, unknown>): string =>
  children.reduce(
    (output, child, index) => output + (callback(child, index, children, callback) || ""),
    "",
  );
