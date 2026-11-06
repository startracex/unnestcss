import {
  ASTERISK,
  AT,
  CARRIAGE_RETURN,
  COLON,
  COMMA,
  DOUBLE_QUOTE,
  EXCLAMATION,
  GREATER_THAN,
  HORIZONTAL_TAB,
  LEFT_CURLY_BRACKET,
  LEFT_PARENTHESIS,
  LEFT_SQUARE_BRACKET,
  LINE_FEED,
  NULL_CHARACTER,
  PLUS,
  REVERSE_SOLIDUS,
  RIGHT_CURLY_BRACKET,
  RIGHT_PARENTHESIS,
  RIGHT_SQUARE_BRACKET,
  SEMICOLON,
  SINGLE_QUOTE,
  SOLIDUS,
  SPACE,
  TILDE,
} from "./chars.ts";

/** Token classification — numeric for hot-path switches. */
export const TokenKind = {
  Identifier: 0,
  CloseDelim: 1,
  OpenDelim: 2,
  Accompanied: 3,
  Break: 4,
  Whitespace: 5,
} as const;

export type TokenKindCode = (typeof TokenKind)[keyof typeof TokenKind];

const hexChar = /^[\da-fA-F]$/;

export const tokenKind = (type: string): TokenKindCode => {
  switch (type) {
    case NULL_CHARACTER:
    case HORIZONTAL_TAB:
    case LINE_FEED:
    case CARRIAGE_RETURN:
    case SPACE:
      return TokenKind.Whitespace;
    case EXCLAMATION:
    case PLUS:
    case COMMA:
    case SOLIDUS:
    case GREATER_THAN:
    case AT:
    case TILDE:
    case SEMICOLON:
    case LEFT_CURLY_BRACKET:
    case RIGHT_CURLY_BRACKET:
      return TokenKind.Break;
    case COLON:
      return TokenKind.Accompanied;
    case DOUBLE_QUOTE:
    case SINGLE_QUOTE:
    case LEFT_PARENTHESIS:
    case LEFT_SQUARE_BRACKET:
      return TokenKind.OpenDelim;
    case RIGHT_PARENTHESIS:
    case RIGHT_SQUARE_BRACKET:
      return TokenKind.CloseDelim;
    default:
      return TokenKind.Identifier;
  }
};

/** @deprecated Prefer {@link tokenKind}; kept as a short alias for call-site familiarity. */
export const token: typeof tokenKind = tokenKind;

export class Tokenizer {
  line = 1;
  column = 1;
  length = 0;
  position = 0;
  character: string = NULL_CHARACTER;
  characters: string;

  constructor(value: string) {
    this.characters = value;
    this.length = value.length;
  }

  prev(): string {
    if (this.position > 0) {
      this.position--;
      this.character = this.characters[this.position]!;
    } else {
      this.character = NULL_CHARACTER;
    }
    this.column--;
    if (this.character === LINE_FEED) {
      this.column = 1;
      this.line--;
    }
    return this.character;
  }

  next(): string {
    if (this.position < this.length) {
      this.character = this.characters[this.position]!;
      this.position++;
    } else {
      this.character = NULL_CHARACTER;
    }
    this.column++;
    if (this.character === LINE_FEED) {
      this.column = 1;
      this.line++;
    }
    return this.character;
  }

  peek(): string {
    return this.characters[this.position] || NULL_CHARACTER;
  }

  slice(begin: number, end: number): string {
    return this.characters.slice(begin, end);
  }

  delimit(type: string): string {
    const closer =
      type === LEFT_SQUARE_BRACKET
        ? RIGHT_SQUARE_BRACKET
        : type === LEFT_PARENTHESIS
          ? RIGHT_PARENTHESIS
          : type;
    return this.slice(this.position - 1, this.readDelimiter(closer)).trim();
  }

  tokenize(): string[] {
    const children: string[] = [];
    while (this.next() !== NULL_CHARACTER) {
      switch (tokenKind(this.character)) {
        case TokenKind.Identifier:
          children.push(this.identifier(this.position - 1));
          break;
        case TokenKind.OpenDelim:
          children.push(this.delimit(this.character));
          break;
        default:
          children.push(this.character);
      }
    }
    return children;
  }

  whitespace(previous: string): string {
    this.character = this.peek();
    while (this.character !== NULL_CHARACTER) {
      this.character = this.peek();
      if ((this.character.charCodeAt(0) | 0) < 33) {
        this.next();
      } else {
        break;
      }
    }
    // stylis: token(prev) > 2 || token(next) > 3 → drop the space
    return tokenKind(previous) > TokenKind.OpenDelim ||
      tokenKind(this.character) > TokenKind.Accompanied
      ? ""
      : SPACE;
  }

  escaping(index: number, count: number): string {
    let remaining = count - 1;
    while (remaining && this.next() !== NULL_CHARACTER) {
      remaining--;
      if (!hexChar.test(this.character)) {
        break;
      }
    }
    return this.slice(
      index,
      this.position + +(remaining < 6 && this.peek() === SPACE && this.next() === SPACE),
    );
  }

  commenter(type: string, index: number): string {
    while (this.next() !== NULL_CHARACTER) {
      if (type === SOLIDUS && this.character === LINE_FEED) {
        break;
      }
      if (type === ASTERISK && this.character === ASTERISK && this.peek() === SOLIDUS) {
        break;
      }
    }
    return `/*${this.slice(index, this.position - 1)}*${type === SOLIDUS ? type : this.next()}`;
  }

  identifier(index: number): string {
    while (!tokenKind(this.peek())) {
      this.next();
    }
    return this.slice(index, this.position);
  }

  private readDelimiter(closer: string): number {
    while (this.next() !== NULL_CHARACTER) {
      switch (this.character) {
        case closer:
          return this.position;
        case DOUBLE_QUOTE:
        case SINGLE_QUOTE:
          if (closer !== DOUBLE_QUOTE && closer !== SINGLE_QUOTE) {
            this.readDelimiter(this.character);
          }
          break;
        case LEFT_PARENTHESIS:
          if (closer === RIGHT_PARENTHESIS) {
            this.readDelimiter(closer);
          }
          break;
        case REVERSE_SOLIDUS:
          this.next();
          break;
      }
    }
    return this.position;
  }
}
