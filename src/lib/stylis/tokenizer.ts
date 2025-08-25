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
} from "./enum.ts";
import { charCodeAt, isHexChar } from "./utility.ts";

export const token = (type: string): number => {
  switch (type) {
    // \0 \t \n \r    whitespace token
    case NULL_CHARACTER:
    case HORIZONTAL_TAB:
    case LINE_FEED:
    case CARRIAGE_RETURN:
    case SPACE:
      return 5;
    // ! + , / > @ ~ isolate token
    case EXCLAMATION:
    case PLUS:
    case COMMA:
    case SOLIDUS:
    case GREATER_THAN:
    case AT:
    case TILDE:
    // ; { } breakpoint token
    case SEMICOLON:
    case LEFT_CURLY_BRACKET:
    case RIGHT_CURLY_BRACKET:
      return 4;
    // : accompanied token
    case COLON:
      return 3;
    // " ' ( [ opening delimit token
    case DOUBLE_QUOTE:
    case SINGLE_QUOTE:
    case LEFT_PARENTHESIS:
    case LEFT_SQUARE_BRACKET:
      return 2;
    // ) ] closing delimit token
    case RIGHT_PARENTHESIS:
    case RIGHT_SQUARE_BRACKET:
      return 1;
  }
  return 0;
};

export class Tokenizer {
  line = 1;
  column = 1;
  length = 0;
  position = 0;
  character?: string;
  characters: string;
  constructor(value: string) {
    this.characters = value;
    this.length = this.characters.length;
  }

  prev(): string {
    if (this.position > 0) {
      this.position--;
      this.character = this.characters[this.position];
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
      this.character = this.characters[this.position];
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
    return this.slice(
      this.position - 1,
      this._delimiter(
        type === LEFT_SQUARE_BRACKET
          ? RIGHT_SQUARE_BRACKET
          : type === LEFT_PARENTHESIS
            ? RIGHT_PARENTHESIS
            : type,
      ),
    ).trim();
  }

  tokenize(): string[] {
    return this._tokenizer([]);
  }

  whitespace(type: string): string {
    this.character = this.peek();
    while (this.character !== NULL_CHARACTER) {
      this.character = this.peek();
      if (charCodeAt(this.character) < 33) {
        this.next();
      } else {
        break;
      }
    }
    return token(type) > 2 || token(this.character) > 3 ? "" : SPACE;
  }

  protected _tokenizer(children: string[]): string[] {
    while (this.next() !== NULL_CHARACTER) {
      switch (token(this.character)) {
        case 0:
          children.push(this.identifier(this.position - 1));
          break;
        case 2:
          children.push(this.delimit(this.character));
          break;
        default:
          children.push(this.character);
      }
    }
    return children;
  }

  escaping(index: number, count: number): string {
    count--;
    while (count && this.next() !== NULL_CHARACTER) {
      count--;
      // not 0-9 A-F a-f
      if (!isHexChar(this.character)) {
        break;
      }
    }
    return this.slice(
      index,
      this.position + +(count < 6 && this.peek() === SPACE && this.next() === SPACE),
    );
  }

  protected _delimiter(type: string): number {
    while (this.next() !== NULL_CHARACTER) {
      switch (this.character) {
        // ] ) " '
        case type:
          return this.position;
        // " '
        case DOUBLE_QUOTE:
        case SINGLE_QUOTE:
          if (type !== DOUBLE_QUOTE && type !== SINGLE_QUOTE) {
            this._delimiter(this.character);
          }
          break;
        // (
        case LEFT_PARENTHESIS:
          if (type === RIGHT_PARENTHESIS) {
            this._delimiter(type);
          }
          break;
        // \
        case REVERSE_SOLIDUS:
          this.next();
          break;
      }
    }
    return this.position;
  }

  commenter(type: string, index: number): string {
    while (this.next() !== NULL_CHARACTER) {
      // //
      if (type === SOLIDUS && this.character === LINE_FEED) {
        break;
      } // /*
      if (type === ASTERISK && this.character === ASTERISK && this.peek() === SOLIDUS) {
        break;
      }
    }
    return `/*${this.slice(index, this.position - 1)}*${type === SOLIDUS ? type : this.next()}`;
  }

  identifier(index: number): string {
    while (!token(this.peek())) {
      this.next();
    }
    return this.slice(index, this.position);
  }
}
