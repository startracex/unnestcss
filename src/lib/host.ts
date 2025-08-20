import { type Element, RULESET, tokenize } from "./stylis.ts";

const _host = "host";

export const host = (element: Element): void => {
  if (element.type === RULESET && element.parent?.value.startsWith(":" + _host)) {
    element.props = (element.props as string[]).map((item) => {
      const tokens = tokenize(item);
      let start: number | undefined,
        end = tokens.length,
        hasHost = false;
      for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];
        switch (token) {
          case ":":
            if (tokens.length > index + 2 && tokens[index + 1] === _host) {
              const afterHostToken = tokens[index + 2];
              if (
                afterHostToken === ":" ||
                (afterHostToken.startsWith("[") && afterHostToken.endsWith("]"))
              ) {
                start = index + 2;
                hasHost = true;
              }
            }
            break;
          case " ":
          case ">":
          case "~":
          case "+":
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
