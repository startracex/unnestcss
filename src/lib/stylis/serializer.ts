import { IMPORT, LAYER, COMMENT, RULESET, DECLARATION, KEYFRAMES, NAMESPACE } from "./enum.ts";
import type { Element, Middleware } from "./types.ts";
import { strlen } from "./utility.ts";

export function serialize(children: Element[], callback: Middleware): string {
  var output = "";

  for (let i = 0; i < children.length; i++) {
    output += callback(children[i], i, children, callback) || "";
  }

  return output;
}

export function stringify(
  element: Element,
  _index: number,
  children: Element[],
  callback: Middleware,
): string {
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
      return (element.return = `${element.value}{${serialize(element.children, callback)}}`);
    case RULESET:
      if (!strlen((element.value = element.props.join(",")))) {
        return "";
      }
  }

  return strlen((children = serialize(element.children, callback) as any))
    ? (element.return = `${element.value}{${children}}`)
    : "";
}
