import yaml from 'js-yaml';
import fs from 'fs';
import csv from 'csv-parser';

import { Maybe, Just, Nothing } from './lib/Maybe';

export function anyOf<T>(predicate: ((x: T) => boolean), xs: T[]): boolean {
  for (let i = 0; i < xs.length; i++) {
    if (predicate(xs[i])) {
      return true;
    }
  }
  return false;
}

export function range_spread(spread: string): number[] {
  const nums = spread.split('..').map(str => parseInt(str, 10));
  if (nums.length != 2 || anyOf(isNaN, nums)) {
    throw new SyntaxError('Dot range is not properly formatted!');
  }
  const high = nums[1];
  const low = nums[0];
  const ret: number[] = [];
  for (let i = low; i <= high; i++) {
    ret.push(i);
  }
  return ret;
}

export function maybe_range_spread(spread: string): Maybe<number[]> {
  try {
    return Just(range_spread(spread));
  } catch (e) {
    return Nothing;
  }
}


export function allOf<T>(predicate: ((x: T) => boolean), xs: T[]): boolean {
  for (let i = 0; i < xs.length; i++) {
    if (!predicate(xs[i])) {
      return false;
    }
  }
  return true;
}

export function argsString(max: number): string {
  return range_spread(`1..${max}`).map(n => '$' + n).join(', ');
}


export async function load_csv(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const results: unknown[] = [];

    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('error', (e) => reject(e))
      .on('end', () => resolve(results));
  });
}

export function load_yaml(path: string): unknown {
  return yaml.safeLoad(fs.readFileSync(path, 'utf8'));
}

export function has_prop(obj, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function remove_duplicates<T>(xs: T[]): T[] {
  const array_set = new Set(xs);
  return [...array_set];
}

export function find_missing_params(a, props: string[]): Record<string, boolean> {
  const vals: Record<string, boolean> = {};
  props.forEach((v) => {
    if (!has_prop(a, v)) {
      vals[v] = true;
    }
  });
  return vals;
}


export function remove_spaces(str: string): string {
  return str.split(' ').join('');
}

function replace_symbol_with_phrase(char: string): string {
  switch (char) {
    case '%': return 'Pcnt';
    case '-': return 'To';
    case '&': return 'And';
    default: return char;
  }
}

function replace_all_symbols_with_phrases(str: string): string {
  return str.split('').map(replace_symbol_with_phrase).join('');
}

export function sanitize_name(str: string): string {
  return remove_spaces(replace_all_symbols_with_phrases(str));
}

export function location_exists(path: string): boolean {
  return fs.existsSync(path);
}

export function zip<A,B>(as: A[], bs: B[]): Array<[A, B]> {
  if (as.length > bs.length) {
    return bs.map((b, index) => [as[index], b]);
  } else {
    return as.map((a, index) => [a, bs[index]]);
  }
}