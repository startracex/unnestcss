const LeftBrance = "{";
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
    const _lastStack: ParseResult[] = [];
    let _selectorStart: number = 0;
    let _contentStart: number = 0;
    let _deep = 0;

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
        _selectorStart = this.index + 1;
        this.result.content += this.raw.slice(_contentStart, this.index + 1);
        continue;
      }

      /**
       * There's an opening curly brace here,
       * and the content before is a selector,
       * and after that it's content.
       *
       * Creates a new result for the current selector and pushes it to the stack.
       */
      if (char === LeftBrance) {
        _deep++;
        const selector = this.raw.slice(_selectorStart, this.index);
        _selectorStart = this.index + 1;
        _contentStart = this.index + 1;
        const childResult: ParseResult = {
          selector,
          content: "",
          deep: _deep,
          index: this.index,
          children: [],
        };
        _lastStack.push(this.result);
        this.result = childResult;
        continue;
      }

      /**
       * The contents of a selector end.
       *
       * Pop the current result from the stack and join the parent's children.
       */
      if (char === RightBrace) {
        _deep--;
        if (_lastStack.length > 0) {
          const parent = _lastStack.pop();
          if (parent) {
            parent.children.push(this.result);
            this.result = parent;
          }
        }
        _selectorStart = this.index + 1;
        _contentStart = this.index + 1;
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
    let currentSelector = result.selector.trim();
    if (currentSelector === "&") {
      if (result.deep === 1) {
        currentSelector = ":scope";
      } else {
        currentSelector = parentSelector + ":is(" + parentSelector + ")";
      }
    } else if (currentSelector.includes("&")) {
      currentSelector = currentSelector.replace("&", parentSelector).trim();
    } else {
      currentSelector = (parentSelector + " " + currentSelector).trim();
    }

    let currentContent = result.content.trim();
    if (currentContent) {
      unnestResult +=
        currentSelector + LeftBrance + currentContent + RightBrace;
    }

    for (const child of result.children) {
      const childCSS = this.unnest(child, currentSelector);
      unnestResult += childCSS;
    }
    return unnestResult;
  }
}

export default Parser;
