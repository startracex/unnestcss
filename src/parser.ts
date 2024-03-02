const LeftBrace = "{";
const RightBrace = "}";

export interface ParseResult {
  selector: string;
  content: string;
  deep: number;
  index: number;
  children: ParseResult[];
}

export class Parser {
  raw: string;
  index: number = 0;
  result: ParseResult;
  css: string;

  constructor(
    raw: string,
    result: ParseResult = {
      selector: "",
      content: "",
      deep: 0,
      index: 0,
      children: [],
    }
  ) {
    this.raw = raw;
    this.result = result;
  }

  parse(): ParseResult {
    const lastStack: ParseResult[] = [];
    let selectorStart: number = 0;
    let contentStart: number = 0;
    let deep = 0;

    for (this.index = 0; this.index < this.raw.length; this.index++) {
      const char = this.raw[this.index];

      /**
       * There is one quotation mark here,
       * and when the next quotation mark matches,
       * ignore the content between them.
       */
      if (char === "'" || char === '"') {
        const qchar = char;
        this.index++;
        for (; this.index < this.raw.length; this.index++) {
          const c = this.raw[this.index];
          if (c === "\\") {
            this.index++;
          }
          if (c === qchar) {
            break;
          }
        }
        continue;
      }

      /**
       * There's a quote here,
       * it's a property end,
       * and what follows it could be a selector.
       */
      if (char === ";") {
        selectorStart = this.index + 1;
        this.result.content = this.raw
          .slice(contentStart, this.index + 1)
          .trim(); // Trim content start.
        continue;
      }

      /**
       * There's an opening curly brace here,
       * and the content before is a selector,
       * and after that it's content.
       *
       * Creates a new result for the current selector and pushes it to the stack.
       */
      if (char === LeftBrace) {
        deep++;
        const selector = this.raw.slice(selectorStart, this.index).trim(); // Trim selector start.
        selectorStart = this.index + 1;
        contentStart = this.index + 1;
        const childResult: ParseResult = {
          selector,
          content: "",
          deep,
          index: this.index,
          children: [],
        };
        lastStack.push(this.result);
        this.result = childResult;
        continue;
      }

      /**
       * The contents of a selector end.
       *
       * Pop the current result from the stack and join the parent's children.
       */
      if (char === RightBrace) {
        deep--;
        if (lastStack.length > 0) {
          const parent = lastStack.pop();
          if (parent) {
            parent.children.push(this.result);
            this.result = parent;
          }
        }
        selectorStart = this.index + 1;
        contentStart = this.index + 1;
        continue;
      }
    }

    return this.result;
  }

  unnest(
    result: ParseResult = this.result,
    parentSelector: string = ""
  ): string {
    let unnestResult = "";
    let selector = result.selector;
    if (selector === "&") {
      if (result.deep === 1) {
        selector = ":scope";
      } else {
        selector = parentSelector + ":is(" + parentSelector + ")";
      }
    } else if (selector.includes("&")) {
      selector = selector.replace("&", parentSelector);
    } else {
      selector = parentSelector + " " + selector;
    }

    let content = result.content;
    if (content) {
      unnestResult += selector + LeftBrace + content + RightBrace;
    }

    for (const child of result.children) {
      const childCSS = this.unnest(child, selector);
      unnestResult += childCSS;
    }
    this.css = unnestResult;
    return unnestResult;
  }
}

export default Parser;
