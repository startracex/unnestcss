import {
  COLON,
  type Element,
  GREATER_THAN,
  LEFT_SQUARE_BRACKET,
  PLUS,
  RIGHT_SQUARE_BRACKET,
  RULESET,
  SPACE,
  TILDE,
  Tokenizer,
} from "./stylis.ts";

const _host = "host";

export const host = (element: Element): void => {
  if (element.type === RULESET && element.parent?.value.startsWith(COLON + _host)) {
    element.props = (element.props as string[]).map((item) => {
      const tokens = new Tokenizer(item).tokenize();
      let start: number | undefined,
        end = tokens.length,
        hasHost = false;
      for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        switch (token) {
          case COLON:
            if (tokens.length > index + 2 && tokens[index + 1] === _host) {
              const afterHostToken = tokens[index + 2];
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
        return `:${_host}(${tokens.slice(start, end).join("")})${tokens.slice(end).join("")}`;
      }
      return item;
    });
  }
};

export default host;
