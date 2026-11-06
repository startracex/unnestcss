import {
  COLON,
  GREATER_THAN,
  LEFT_SQUARE_BRACKET,
  PLUS,
  RIGHT_SQUARE_BRACKET,
  RULESET,
  SPACE,
  TILDE,
  Tokenizer,
  isRuleset,
  type Middleware,
} from "./css.ts";

const HOST = "host";

export const host: Middleware = (element) => {
  if (element.type !== RULESET || !isRuleset(element)) {
    return;
  }
  if (!element.parent?.value.startsWith(COLON + HOST)) {
    return;
  }

  element.props = element.props.map((item) => {
    const tokens = new Tokenizer(item).tokenize();
    let start: number | undefined;
    let end = tokens.length;
    let hasHost = false;

    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index]!;
      switch (token) {
        case COLON:
          if (tokens.length > index + 2 && tokens[index + 1] === HOST) {
            const afterHostToken = tokens[index + 2]!;
            if (
              afterHostToken === COLON ||
              (afterHostToken.startsWith(LEFT_SQUARE_BRACKET) &&
                afterHostToken.endsWith(RIGHT_SQUARE_BRACKET))
            ) {
              start = index + 2;
              hasHost = true;
            }
          }
          break;
        case SPACE:
        case GREATER_THAN:
        case TILDE:
        case PLUS:
          if (hasHost) {
            end = index;
          }
          break;
      }
    }

    if (hasHost) {
      return `:${HOST}(${tokens.slice(start, end).join("")})${tokens.slice(end).join("")}`;
    }
    return item;
  });
};

export default host;
