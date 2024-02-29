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

  private _stack: ParseResult[] = [];
  private _selector: string;
  private _selectorStart: number = 0;
  private _contentStart: number = 0;
  private _contentEnd: number = 0;
  private _deep = 0;

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
    for (this.index = 0; this.index < this.raw.length; this.index++) {
      const char = this.raw[this.index];

      if (char === "'" || char === `"`) {
        const qchar = char;
        for (this.index++; this.index < this.raw.length; this.index++) {
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

      if (char === ";") {
        this._selectorStart = this.index + 1;
        this._contentEnd = this.index;
        this.result.content += this.raw.slice(
          this._contentStart,
          this._contentEnd + 1
        );
        continue;
      }

      if (char === "{") {
        this._deep++;
        this._selector = this.raw.slice(this._selectorStart, this.index);
        this._selectorStart = this.index + 1;
        this._contentStart = this.index + 1;
        const childResult: ParseResult = {
          selector: this._selector,
          content: "",
          deep: this._deep,
          index: this.index,
          children: [],
        };
        this._stack.push(this.result);
        this.result = childResult;
        continue;
      }

      if (char === "}") {
        this._deep--;
        if (this._stack.length > 0) {
          const parent = this._stack.pop();
          if (parent) {
            parent.children.push(this.result);
            this.result = parent;
          }
        }
        this._selectorStart = this.index + 1;
        this._contentStart = this.index + 1;
        continue;
      }
    }
    return this.result;
  }

  unnest(
    result: ParseResult = this.result,
    parentSelector: string = ""
  ): string {
    let CSSResult = "";
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
      CSSResult += currentSelector + "{" + currentContent + "}";
    }

    for (const child of result.children) {
      const childCSS = this.unnest(child, currentSelector);
      CSSResult += childCSS;
    }

    return CSSResult;
  }
}

export default Parser;
