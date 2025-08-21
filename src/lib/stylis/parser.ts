import { COMMENT, DECLARATION, RULESET } from "./enum.ts";
import { charat } from "./utility.ts";
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

export const ruleset = (
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
): Element => {
  let currentPosition = offset - 1;

  const activeRules = offset === 0 ? rules : [""];
  const ruleCount = activeRules.length;

  for (let itemIndex = 0, propIndex = 0; itemIndex < index; itemIndex++) {
    const pointPosition = points[itemIndex];
    const segmentEnd = Math.abs(pointPosition);

    const substring = value.slice(currentPosition + 1, segmentEnd);
    currentPosition = segmentEnd;

    for (let ruleIndex = 0; ruleIndex < ruleCount; ruleIndex++) {
      const processedValue =
        pointPosition > 0
          ? `${activeRules[ruleIndex]} ${substring}`.trim()
          : substring.replace(/&\f/g, activeRules[ruleIndex]).trim();

      props[propIndex++] = processedValue;
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
};

export const comment = (
  value: string,
  root: Element,
  parent: Element | null,
  siblings?: Element[],
): Element => {
  return node(
    value,
    root,
    parent,
    COMMENT,
    String.fromCharCode(char()),
    value.slice(2, -2),
    0,
    siblings,
  );
};

export const declaration = (
  value: string,
  root: Element,
  parent: Element | null,
  length: number,
  siblings?: Element[],
): Element => {
  return node(
    value,
    root,
    parent,
    DECLARATION,
    value.slice(-length),
    value.slice(-length + 1, -1),
    length,
    siblings,
  );
};

export const parse = (
  value: string,
  root: Element,
  parent: Element | null,
  rule: Element | string[],
  rules: string[],
  rulesets: Element[],
  pseudo: number,
  points: number[],
  declarations: string[] | Element[],
): Element[] => {
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
    previous = character;
    character = next();
    switch (character) {
      // (
      case 40:
        if (previous !== 108 && charat(characters, length - 1) === 58) {
          const processedChar = delimit(character).replace("&", "&\f");
          characters += processedChar;
          const startPos = Math.abs(index ? points[index - 1] : 0);

          if (characters.indexOf("&\f", startPos) !== -1) {
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
            (declarations as unknown as Element[]).push(
              comment(
                commenter(next(), caret()),
                root,
                parent,
                declarations as unknown as Element[],
              ),
            );
            if (
              (token(previous || 1) === 5 || token(peek() || 1) === 5) &&
              characters.length &&
              characters.slice(-1) !== " "
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
        points[index++] = characters.length * ampersand;
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
              characters = characters.replace(/\f/g, "");
            }
            if (
              property > 0 &&
              (characters.length - length || (variable === 0 && previous === 47))
            ) {
              (declarations as unknown as Element[]).push(
                property > 32
                  ? declaration(
                      `${characters};`,
                      rule as Element,
                      parent,
                      length - 1,
                      declarations as unknown as Element[],
                    )
                  : declaration(
                      `${characters.replace(" ", "")};`,
                      rule as Element,
                      parent,
                      length - 2,
                      declarations as unknown as Element[],
                    ),
              );
            }
            break;
          // @ ;
          case 59:
            characters += ";";
          // { rule/at-rule
          default:
            props = [];
            children = [];
            rulesets.push(
              (reference = ruleset(
                characters,
                root,
                parent,
                index,
                offset,
                rules,
                points,
                type,
                props,
                children,
                length,
                rulesets,
              )),
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
                      (() => {
                        children.push(
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
                        );

                        return children as any;
                      })(),
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
        length = 1 + characters.length;
        property = previous;
      default:
        if (variable < 1) {
          if (character === 123) {
            --variable;
          } else if (character === 125 && variable++ === 0 && prev() === 125) {
            continue;
          }
        }
        characters += String.fromCharCode(character);
        switch (character * variable) {
          // &
          case 38:
            ampersand = offset > 0 ? 1 : ((characters += "\f"), -1);
            break;
          // ,
          case 44:
            points[index++] = (characters.length - 1) * ampersand;
            ampersand = 1;
            break;
          // @
          case 64:
            // -
            if (peek() === 45) {
              characters += delimit(next());
            }

            atrule = peek();
            type = characters += identifier(caret());
            offset = length = type.length;
            character++;
            break;
          // -
          case 45:
            if (previous === 45 && characters.length === 2) {
              variable = 0;
            }
        }
    }
  }

  return rulesets;
};

export const compile = (value: string): Element[] => {
  return dealloc(
    parse("", null, null, null, [""], ((value as any) = alloc(value)), 0, [0], value as any),
  );
};
