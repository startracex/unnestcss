import { charat } from "./utility.ts";
import { RULESET } from "./enum.js";
import { tokenize } from "./tokenizer.ts";
import type { Element, Middleware } from "./types.ts";
import { serialize } from "./serializer.ts";

export const middleware =
  (collection: Middleware[]): Middleware =>
  (element, index, children, callback) =>
    serialize(collection, (currentMiddleware) =>
      currentMiddleware(element, index, children, callback),
    );

export const namespace = (element: Element): string | void => {
  if (element.type === RULESET) {
    element.props = element.props.map((value) =>
      tokenize(value)
        .map((value, index, children) => {
          switch (charat(value, 0)) {
            // \f
            case 12:
              return value.slice(1, value.length);
            // \0 ( + > ~
            case 0:
            case 40:
            case 43:
            case 62:
            case 126:
              return value;
            // :
            case 58:
              if (children[++index] === "global") {
                children[index] = "";
                children[++index] = `\f${children[index].slice((index = 1), -1)}`;
              }
            // \s
            case 32:
              return index === 1 ? "" : value;
            default:
              switch (index) {
                case 0:
                  element = value as any;
                  return children.length > 1 ? "" : value;
                case (index = children.length - 1):
                case 2:
                  return index === 2 ? value + element + element : value + element;
                default:
                  return value;
              }
          }
        })
        .join(""),
    );
  }
};
