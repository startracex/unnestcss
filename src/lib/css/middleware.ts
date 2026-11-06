import {
  COLON,
  GREATER_THAN,
  LEFT_PARENTHESIS,
  NULL_CHARACTER,
  PARENT_REF,
  PLUS,
  RULESET,
  SPACE,
  TILDE,
} from "./chars.ts";
import type { AstNode, Middleware } from "./ast.ts";
import { isRuleset } from "./ast.ts";
import { Tokenizer } from "./tokenizer.ts";
import { serialize } from "./serialize.ts";

export const middleware =
  (collection: Middleware[]): Middleware =>
  (element, index, children, callback) =>
    serialize(collection, (currentMiddleware) =>
      currentMiddleware(element, index, children, callback),
    );

export const namespace = (element: AstNode): string | void => {
  if (element.type !== RULESET || !isRuleset(element)) {
    return;
  }

  element.props = element.props.map((selector) => {
    const tokens = new Tokenizer(selector).tokenize();
    let parentClass = "";

    return tokens
      .map((token, index, children) => {
        if (!token) {
          return token;
        }

        switch (token[0]) {
          case PARENT_REF:
            return token.slice(1);
          case NULL_CHARACTER:
          case LEFT_PARENTHESIS:
          case PLUS:
          case GREATER_THAN:
          case TILDE:
            return token;
          case COLON:
            index++;
            if (children[index] === "global") {
              children[index] = "";
              index++;
              children[index] = `\f${children[index]!.slice(1, -1)}`;
              index = 1;
            }
          // fallthrough
          case SPACE:
            return index === 1 ? "" : token;
          default:
            switch (index) {
              case 0:
                parentClass = token;
                return children.length > 1 ? "" : token;
              case (index = children.length - 1):
              case 2:
                return index === 2 ? token + parentClass + parentClass : token + parentClass;
              default:
                return token;
            }
        }
      })
      .join("");
  });
};
