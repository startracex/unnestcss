import { charat, combine, sizeof, substr, strlen } from "./utility.ts";
import { RULESET } from "./enum.js";
import { tokenize } from "./tokenizer.ts";
import type { Element, Middleware } from "./types.ts";

export function middleware(collection: Middleware[]): Middleware {
  const length = sizeof(collection);

  return (element, index, children, callback) => {
    let output = "";

    for (let i = 0; i < length; i++) {
      output += collection[i](element, index, children, callback) || "";
    }

    return output;
  };
}

export function namespace(element: Element): string | void {
  switch (element.type) {
    case RULESET:
      element.props = element.props.map((value) =>
        combine(tokenize(value), (value, index, children) => {
          switch (charat(value, 0)) {
            // \f
            case 12:
              return substr(value, 1, strlen(value));
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
                children[++index] = `\f${substr(children[index], (index = 1), -1)}`;
              }
            // \s
            case 32:
              return index === 1 ? "" : value;
            default:
              switch (index) {
                case 0:
                  // @ts-expect-error
                  element = value;
                  return sizeof(children) > 1 ? "" : value;
                case (index = sizeof(children) - 1):
                case 2:
                  return index === 2 ? value + element + element : value + element;
                default:
                  return value;
              }
          }
        }),
      );
  }
}
