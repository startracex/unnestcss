import { COMMENT, DECLARATION, RULESET } from "./enum.ts";
import {
  abs,
  append,
  charat,
  from,
  indexof,
  replace,
  sizeof,
  strlen,
  substr,
  trim,
} from "./utility.ts";
import {
  alloc,
  caret,
  char,
  commenter,
  dealloc,
  delimit,
  escaping,
  identifier,
  next,
  node,
  peek,
  prev,
  token,
  whitespace,
} from "./tokenizer.ts";
import type { Element } from "./types.ts";

export function compile(value: string): Element[] {
  return dealloc(
    parse("", null, null, null, [""], ((value as any) = alloc(value)), 0, [0], value as any),
  );
}

export function parse(
  value: string,
  root: Element,
  parent: Element | null,
  rule: Element | string[],
  rules: string[],
  rulesets: Element[],
  pseudo: number,
  points: number[],
  declarations: string[] | Element[],
): Element[] {
  let index = 0;
  let offset = 0;
  let length = pseudo;
  let atrule = 0;
  let property = 0;
  let previous = 0;
  let variable = 1;
  let scanning = 1;
  let ampersand = 1;
  let character = 0;
  let type = "";
  let props = rules;
  let children = rulesets;
  let reference = rule;
  let characters = type;

  while (scanning) {
    switch (((previous = character), (character = next()))) {
      // (
      case 40:
        if (previous !== 108 && charat(characters, length - 1) === 58) {
          if (
            indexof(
              (characters += replace(delimit(character), "&", "&\f")),
              "&\f",
              abs(index ? points[index - 1] : 0),
            ) !== -1
          ) {
            ampersand = -1;
          }
          break;
        }
      // " ' [
      case 34:
      case 39:
      case 91:
        characters += delimit(character);
        break;
      // \t \n \r \s
      case 9:
      case 10:
      case 13:
      case 32:
        characters += whitespace(previous);
        break;
      // \
      case 92:
        characters += escaping(caret() - 1, 7);
        continue;
      // /
      case 47:
        switch (peek()) {
          case 42:
          case 47:
            append(
              comment(
                commenter(next(), caret()),
                root,
                parent,
                declarations as unknown as Element[],
              ),
              declarations as unknown as Element[],
            );
            if (
              (token(previous || 1) === 5 || token(peek() || 1) === 5) &&
              strlen(characters) &&
              substr(characters, -1) !== " "
            ) {
              characters += " ";
            }
            break;
          default:
            characters += "/";
        }
        break;
      // {
      case 123 * variable:
        points[index++] = strlen(characters) * ampersand;
      // } ; \0
      case 125 * variable:
      case 59:
      case 0:
        switch (character) {
          // \0 }
          case 0:
          case 125:
            scanning = 0;
          // ;
          case 59 + offset:
            if (ampersand === -1) {
              characters = replace(characters, /\f/g, "");
            }
            if (
              property > 0 &&
              (strlen(characters) - length || (variable === 0 && previous === 47))
            ) {
              append(
                property > 32
                  ? declaration(
                      `${characters};`,
                      rule as Element,
                      parent,
                      length - 1,
                      declarations as unknown as Element[],
                    )
                  : declaration(
                      `${replace(characters, " ", "")};`,
                      rule as Element,
                      parent,
                      length - 2,
                      declarations as unknown as Element[],
                    ),
                declarations as unknown as Element[],
              );
            }
            break;
          // @ ;
          case 59:
            characters += ";";
          // { rule/at-rule
          default:
            append(
              (reference = ruleset(
                characters,
                root,
                parent,
                index,
                offset,
                rules,
                points,
                type,
                (props = []),
                (children = []),
                length,
                rulesets,
              )),
              rulesets,
            );

            if (character === 123) {
              if (offset === 0) {
                parse(
                  characters,
                  root,
                  reference,
                  reference,
                  props,
                  rulesets,
                  length,
                  points,
                  children,
                );
              } else {
                switch (atrule) {
                  // c(ontainer)
                  case 99:
                    if (charat(characters, 3) === 110) {
                      break;
                    }
                  // l(ayer)
                  case 108:
                    if (charat(characters, 2) === 97) {
                      break;
                    }
                  default:
                    offset = 0;
                  // d(ocument) m(edia) s(upports)
                  case 100:
                  case 109:
                  case 115:
                    break;
                }
                if (offset) {
                  parse(
                    value,
                    reference,
                    reference,
                    rule &&
                      append(
                        ruleset(
                          value,
                          reference,
                          reference,
                          0,
                          0,
                          rules,
                          points,
                          type,
                          rules,
                          (props = []),
                          length,
                          children,
                        ),
                        children,
                      ),
                    rules,
                    children,
                    length,
                    points,
                    rule ? props : children,
                  );
                } else {
                  parse(
                    characters,
                    reference,
                    reference,
                    reference,
                    [""],
                    children,
                    0,
                    points,
                    children,
                  );
                }
              }
            }
        }
        index = offset = property = 0;
        variable = ampersand = 1;
        type = characters = "";
        length = pseudo;
        break;
      // :
      case 58:
        length = 1 + strlen(characters);
        property = previous;
      default:
        if (variable < 1) {
          if (character === 123) {
            --variable;
          } else if (character === 125 && variable++ === 0 && prev() === 125) {
            continue;
          }
        }

        switch (((characters += from(character)), character * variable)) {
          // &
          case 38:
            ampersand = offset > 0 ? 1 : ((characters += "\f"), -1);
            break;
          // ,
          case 44:
            points[index++] = (strlen(characters) - 1) * ampersand;
            ampersand = 1;
            break;
          // @
          case 64:
            // -
            if (peek() === 45) {
              characters += delimit(next());
            }

            atrule = peek();
            offset = length = strlen((type = characters += identifier(caret())));
            character++;
            break;
          // -
          case 45:
            if (previous === 45 && strlen(characters) === 2) {
              variable = 0;
            }
        }
    }
  }

  return rulesets;
}

export function ruleset(
  value: string,
  root: Element,
  parent: Element | null,
  index: number,
  offset: number,
  rules: string[],
  points: number[],
  type: string,
  props: string[],
  children: Element[],
  length: number,
  siblings?: Element[],
): Element {
  let post = offset - 1;
  const rule = offset === 0 ? rules : [""];
  const size = sizeof(rule);

  for (let i = 0, j = 0, k = 0; i < index; ++i) {
    for (
      let x = 0, y = substr(value, post + 1, (post = abs((j = points[i])))), z = value;
      x < size;
      ++x
    ) {
      if ((z = trim(j > 0 ? `${rule[x]} ${y}` : replace(y, /&\f/g, rule[x])))) {
        props[k++] = z;
      }
    }
  }

  return node(
    value,
    root,
    parent,
    offset === 0 ? RULESET : type,
    props,
    children,
    length,
    siblings,
  );
}

export function comment(
  value: string,
  root: Element,
  parent: Element | null,
  siblings?: Element[],
): Element {
  return node(value, root, parent, COMMENT, from(char()), substr(value, 2, -2), 0, siblings);
}

export function declaration(
  value: string,
  root: Element,
  parent: Element | null,
  length: number,
  siblings?: Element[],
): Element {
  return node(
    value,
    root,
    parent,
    DECLARATION,
    substr(value, 0, length),
    substr(value, length + 1, -1),
    length,
    siblings,
  );
}
