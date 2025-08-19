export const abs: (x: number) => number = Math.abs;

export const from: (...codes: number[]) => string = String.fromCharCode;

export const assign: typeof Object.assign = Object.assign;

export function hash(value: string, length: number): number {
  return charat(value, 0) ^ 45
    ? (((((((length << 2) ^ charat(value, 0)) << 2) ^ charat(value, 1)) << 2) ^ charat(value, 2)) <<
        2) ^
        charat(value, 3)
    : 0;
}

export function trim(value: string): string {
  return value.trim();
}

export function match(value: string, pattern: RegExp): string | null {
  const result = pattern.exec(value);
  return result ? result[0] : null;
}

export function replace(value: string, pattern: string | RegExp, replacement: string): string {
  return value.replace(pattern, replacement);
}

export function indexof(value: string, search: string, position: number): number {
  return value.indexOf(search, position);
}

export function charat(value: string, index: number): number {
  return value.charCodeAt(index) | 0;
}

export function substr(value: string, begin: number, end?: number): string {
  return value.slice(begin, end);
}

export function strlen(value: string): number {
  return value.length;
}

export function sizeof(value: any[]): number {
  return value.length;
}

export function append<T>(value: T, array: T[]): T {
  array.push(value);
  return value;
}

export function combine<T>(
  array: T[],
  callback: (value: T, index: number, array: T[]) => string,
): string {
  return array.map(callback).join("");
}

export function filter(array: string[], pattern: RegExp): string[] {
  return array.filter((value) => !match(value, pattern));
}
