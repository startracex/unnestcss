import {
  COLON,
  FORM_FEED,
  GREATER_THAN,
  LEFT_PARENTHESIS,
  NULL_CHARACTER,
  PLUS,
  RULESET,
  SPACE,
  TILDE,
} from "./enum.js";
import { Tokenizer } from "./tokenizer.ts";
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
      new Tokenizer(value)
        .tokenize()
        .map((value, index, children) => {
          if (!value) {
            return value;
          }
          switch (value[0]) {
            // \f
            case FORM_FEED:
              return value.slice(1, value.length);
            // \0 ( + > ~
            case NULL_CHARACTER:
            case LEFT_PARENTHESIS:
            case PLUS:
            case GREATER_THAN:
            case TILDE:
              return value;
            // :
            case COLON:
              index++;
              if (children[index] === "global") {
                children[index] = "";
                index++;
                children[index] = `\f${children[index].slice((index = 1), -1)}`;
              }
            // \s
            case SPACE:
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
