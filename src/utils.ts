import yaml from 'js-yaml'
import fs from 'fs'
import { join } from 'path'
import csv from 'csv-parser'

import { Maybe, Just, Nothing, isNothing } from './lib/Maybe'
import { Response } from 'express'
import { isLeft, Either } from './lib/Either'

export function anyOf<T>(predicate: ((x: T) => boolean), xs: T[]): boolean {
  for (let i = 0; i < xs.length; i++) {
    if (predicate(xs[i])) {
      return true
    }
  }
  return false
}

// If the range is improperly ordered, it is expected behavior that the result
//   will only contain one element.
export function range_spread(spread: string): number[] {
  const nums = spread.split('..').map(str => parseInt(str, 10))
  if (nums.length != 2 || anyOf(isNaN, nums)) {
    throw new SyntaxError('Dot range is not properly formatted!')
  }
  const high = nums[1]
  const low = nums[0]
  const ret: number[] = []
  for (let i = low; i <= high; i++) {
    ret.push(i)
  }
  return ret
}

export function maybe_range_spread(spread: string): Maybe<number[]> {
  try {
    const parsed_spread = range_spread(spread)
    return Just(parsed_spread)
  } catch (e) {
    return Nothing
  }
}


export function allOf<T>(predicate: ((x: T) => boolean), xs: T[]): boolean {
  for (let i = 0; i < xs.length; i++) {
    if (!predicate(xs[i])) {
      return false
    }
  }
  return true
}

export function argsString(max: number): string {
  return range_spread(`1..${max}`).map(n => '$' + n).join(', ')
}


export async function load_csv(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const results: unknown[] = []

    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('error', (e) => reject(e))
      .on('end', () => resolve(results))
  })
}

export function load_yaml(path: string): unknown {
  return yaml.safeLoad(fs.readFileSync(path, 'utf8'))
}

export function has_prop(obj: any, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

export function remove_duplicates<T>(xs: T[]): T[] {
  const array_set = new Set(xs)
  return [...array_set]
}

export function find_missing_params(a: any, props: string[]): 
                                                      Record<string, boolean> {
  const vals: Record<string, boolean> = {}
  props.forEach((v) => {
    if (!has_prop(a, v)) {
      vals[v] = true
    }
  })
  return vals
}


export function remove_spaces(str: string): string {
  return str.split(' ').join('')
}

function replace_symbol_with_phrase(char: string): string {
  switch (char) {
    case '%': return 'Pcnt'
    case '-': return 'To'
    case '&': return 'And'
    default: return char
  }
}

function replace_all_symbols_with_phrases(str: string): string {
  return str.split('').map(replace_symbol_with_phrase).join('')
}

export function sanitize_name(str: string): string {
  return remove_spaces(replace_all_symbols_with_phrases(str))
}

export function location_exists(path: string): boolean {
  return fs.existsSync(path)
}

export function zip<A,B>(as: A[], bs: B[]): Array<[A, B]> {
  if (as.length > bs.length) {
    return bs.map((b, index) => [as[index], b])
  } else {
    return as.map((a, index) => [a, bs[index]])
  }
}

export function resMaybe<T>(res: Response, maybe: Maybe<T>): void {
  if (isNothing(maybe)) {
    res.sendStatus(404)
    return
  }
  res.json(maybe.value)
}

export function resEither<T, Q>(res: Response, 
                                either: Either<T, Q>, 
                                fail_code: number): void {
  if (isLeft(either)) {
    res.sendStatus(fail_code)
    return
  }
  res.json(either.value)
}

export function has_all_props(obj: any, props: string[]): boolean {
  return allOf((k: string) => has_prop(obj, k), props)
}

export function customReplacer(key: string, value: unknown): unknown {
  return value instanceof Set ? [...value] : value
}

function has_extension(path: string): boolean {
  return path.includes('.')
}

export function readdirSyncRecursive(base: string, path: string): string[] {
  const contents = fs.readdirSync(path)
  return contents.flatMap(c => {
    const full_path = join(path, c)
    const display_path = join(base, c)
    if (!has_extension(c)) return readdirSyncRecursive(display_path, full_path)
    return display_path
  })
}

/**
 * Splits an array of items in two based on if they satisfy the predicate or not.
 * If the item does satisfy the predicate, it goes in the list on the 
 * left hand side of the tuple, else right hand side. 
 * @param as Items to be split
 * @param predicate Function by which to split them
 */
export function splitBy<A>(as: A[], predicate: (a: A) => boolean): [A[], A[]] {
  const m: A[] = [], n: A[] = []
  for (let i = 0; i < as.length; i++) {
    if (predicate(as[i])) {
      m.push(as[i])
    } else {
      n.push(as[i])
    }
  }
  return [m, n]
}

/**
 * Performs func on each item of both sides of a tuple of lists
 * @param tuple tuple of lists
 * @param func function for map
 */
export function tupleMap<A,B>(tuple: [A[], A[]], func: (a: A) => B): [B[], B[]] {
  const [a, b] = tuple
  return [ a.map(func), b.map(func) ]
}