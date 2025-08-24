import { charat } from "./utility.ts";

export const token = (type: number): number => {
  switch (type) {
    // \0 \t \n \r \s whitespace token
    case 0:
    case 9:
    case 10:
    case 13:
    case 32:
      return 5;
    // ! + , / > @ ~ isolate token
    case 33:
    case 43:
    case 44:
    case 47:
    case 62:
    case 64:
    case 126:
    // ; { } breakpoint token
    case 59:
    case 123:
    case 125:
      return 4;
    // : accompanied token
    case 58:
      return 3;
    // " ' ( [ opening delimit token
    case 34:
    case 39:
    case 40:
    case 91:
      return 2;
    // ) ] closing delimit token
    case 41:
    case 93:
      return 1;
  }

  return 0;
};

export class Tokenizer {
  line = 1;
  column = 1;
  length = 0;
  position = 0;
  character = 0;
  characters = "";
  constructor(value: string) {
    this.characters = value;
    this.length = this.characters.length;
  }

  prev(): number {
    if (this.position > 0) {
      this.position--;
      this.character = charat(this.characters, this.position);
    } else {
      this.character = 0;
    }
    this.column--;
    if (this.character === 10) {
      this.column = 1;
      this.line--;
    }

    return this.character;
  }

  next(): number {
    if (this.position < this.length) {
      this.character = charat(this.characters, this.position);
      this.position++;
    } else {
      this.character = 0;
    }
    this.column++;
    if (this.character === 10) {
      this.column = 1;
      this.line++;
    }

    return this.character;
  }

  peek(): number {
    return charat(this.characters, this.position);
  }

  caret(): number {
    return this.position;
  }

  slice(begin: number, end: number): string {
    return this.characters.slice(begin, end);
  }

  delimit(type: number): string {
    return this.slice(
      this.position - 1,
      this._delimiter(type === 91 ? type + 2 : type === 40 ? type + 1 : type),
    ).trim();
  }

  tokenize(): string[] {
    return this._tokenizer([]);
  }

  whitespace(type: number): string {
    while ((this.character = this.peek())) {
      if (this.character < 33) {
        this.next();
      } else {
        break;
      }
    }

    return token(type) > 2 || token(this.character) > 3 ? "" : " ";
  }

  protected _tokenizer(children: string[]): string[] {
    while (this.next()) {
      switch (token(this.character)) {
        case 0:
          children.push(this.identifier(this.position - 1));
          break;
        case 2:
          children.push(this.delimit(this.character));
          break;
        default:
          children.push(String.fromCharCode(this.character));
      }
    }

    return children;
  }

  escaping(index: number, count: number): string {
    count--;
    while (count && this.next()) {
      count--;
      // not 0-9 A-F a-f
      if (
        this.character < 48 ||
        this.character > 102 ||
        (this.character > 57 && this.character < 65) ||
        (this.character > 70 && this.character < 97)
      ) {
        break;
      }
    }

    return this.slice(
      index,
      this.caret() + +(count < 6 && this.peek() === 32 && this.next() === 32),
    );
  }

  protected _delimiter(type: number): number {
    while (this.next()) {
      switch (this.character) {
        // ] ) " '
        case type:
          return this.position;
        // " '
        case 34:
        case 39:
          if (type !== 34 && type !== 39) {
            this._delimiter(this.character);
          }
          break;
        // (
        case 40:
          if (type === 41) {
            this._delimiter(type);
          }
          break;
        // \
        case 92:
          this.next();
          break;
      }
    }

    return this.position;
  }

  commenter(type: number, index: number): string {
    while (this.next()) {
      // //
      if (type + this.character === 47 + 10) {
        break;
      } // /*
      else if (type + this.character === 42 + 42 && this.peek() === 47) {
        break;
      }
    }

    return `/*${this.slice(index, this.position - 1)}*${String.fromCharCode(type === 47 ? type : this.next())}`;
  }

  identifier(index: number): string {
    while (!token(this.peek())) {
      this.next();
    }

    return this.slice(index, this.position);
  }
}
