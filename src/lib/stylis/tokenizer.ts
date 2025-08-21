import type { Element } from "./types.ts";
import { charat } from "./utility.ts";

export var line = 1;
export var column = 1;
export var length = 0;
export var position = 0;
export var character = 0;
export var characters = "";

export const node = (
  value: string,
  root: Element | null,
  parent: Element | null,
  type: string,
  props: string[] | string,
  children: Element[] | string,
  length: number,
  siblings: Element[],
): Element => {
  return {
    value: value,
    root: root,
    parent: parent,
    type: type,
    props: props,
    children: children,
    line: line,
    column: column,
    length: length,
    return: "",
    siblings: siblings,
  } as Element;
};

export const copy = (root: Element, props: Partial<Element>): Element => {
  return Object.assign(
    node("", null, null, "", null, null, 0, root.siblings),
    root,
    { length: -root.length },
    props,
  );
};

export const char = (): number => {
  return character;
};

export const prev = (): number => {
  character = position > 0 ? charat(characters, --position) : 0;

  column--;
  if (character === 10) {
    column = 1;
    line--;
  }

  return character;
};

export const next = (): number => {
  character = position < length ? charat(characters, position++) : 0;

  column++;
  if (character === 10) {
    column = 1;
    line++;
  }

  return character;
};

export const peek = (): number => {
  return charat(characters, position);
};

export const caret = (): number => {
  return position;
};

export const slice = (begin: number, end: number): string => {
  return characters.slice(begin, end);
};

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

export const alloc = (value: string): any[] => {
  line = column = 1;
  characters = value;
  length = characters.length;
  position = 0;
  return [];
};

export const dealloc = (value: any): any => {
  characters = "";
  return value;
};

export const delimit = (type: number): string => {
  return slice(
    position - 1,
    delimiter(type === 91 ? type + 2 : type === 40 ? type + 1 : type),
  ).trim();
};

export const tokenize = (value: string): string[] => {
  return dealloc(tokenizer(alloc(value)));
};

export const whitespace = (type: number): string => {
  while ((character = peek())) {
    if (character < 33) {
      next();
    } else {
      break;
    }
  }

  return token(type) > 2 || token(character) > 3 ? "" : " ";
};

export const tokenizer = (children: string[]): string[] => {
  while (next()) {
    switch (token(character)) {
      case 0:
        children.push(identifier(position - 1));
        break;
      case 2:
        children.push(delimit(character));
        break;
      default:
        children.push(String.fromCharCode(character));
    }
  }

  return children;
};

export const escaping = (index: number, count: number): string => {
  while (--count && next()) {
    // not 0-9 A-F a-f
    if (
      character < 48 ||
      character > 102 ||
      (character > 57 && character < 65) ||
      (character > 70 && character < 97)
    ) {
      break;
    }
  }

  return slice(index, caret() + +(count < 6 && peek() === 32 && next() === 32));
};

export const delimiter = (type: number): number => {
  while (next()) {
    switch (character) {
      // ] ) " '
      case type:
        return position;
      // " '
      case 34:
      case 39:
        if (type !== 34 && type !== 39) {
          delimiter(character);
        }
        break;
      // (
      case 40:
        if (type === 41) {
          delimiter(type);
        }
        break;
      // \
      case 92:
        next();
        break;
    }
  }

  return position;
};

export const commenter = (type: number, index: number): string => {
  while (next()) {
    // //
    if (type + character === 47 + 10) {
      break;
    } // /*
    else if (type + character === 42 + 42 && peek() === 47) {
      break;
    }
  }

  return `/*${slice(index, position - 1)}*${String.fromCharCode(type === 47 ? type : next())}`;
};

export const identifier = (index: number): string => {
  while (!token(peek())) {
    next();
  }

  return slice(index, position);
};
