export const abs: (x: number) => number = Math.abs;

export const from: (...codes: number[]) => string = String.fromCharCode;

export const assign: typeof Object.assign = Object.assign;

export const charat = (value: string, index: number): number => {
  return value.charCodeAt(index) | 0;
};

export const hash = (value: string, length: number): number => {
  return charat(value, 0) ^ 45
    ? (((((((length << 2) ^ charat(value, 0)) << 2) ^ charat(value, 1)) << 2) ^ charat(value, 2)) <<
        2) ^
        charat(value, 3)
    : 0;
};

export const trim = (value: string): string => {
  return value.trim();
};

export const match = (value: string, pattern: RegExp): string | null => {
  const result = pattern.exec(value);
  return result ? result[0] : null;
};

export const replace = (value: string, pattern: string | RegExp, replacement: string): string => {
  return value.replace(pattern, replacement);
};

export const indexof = (value: string, search: string, position: number): number => {
  return value.indexOf(search, position);
};

export const substr = (value: string, begin: number, end?: number): string => {
  return value.slice(begin, end);
};

export const strlen = (value: string): number => {
  return value.length;
};

export const sizeof = (value: any[]): number => {
  return value.length;
};

export const append = <T>(value: T, array: T[]): T => {
  array.push(value);
  return value;
};

export const combine = <T>(
  array: T[],
  callback: (value: T, index: number, array: T[]) => string,
): string => {
  return array.map(callback).join("");
};

export const filter = (array: string[], pattern: RegExp): string[] => {
  return array.filter((value) => !match(value, pattern));
};
