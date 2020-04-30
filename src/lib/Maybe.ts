/**
 * @description The Maybe monad in Typescript. August 2019
 * @author Evan Derby (evan.derby@du.edu)
 */

export interface Nothing {
  value: null;
}

export interface Just<T> {
  value: T;
}

export const Nothing = { value: null };

export function Just<T>(v: T): Maybe<T> {
  return { value: v };
}

export function isNothing<A>(val: Maybe<A>): val is Nothing {
  return (val as Nothing).value === null;
}

export function isJust<T>(val: Maybe<T>): val is Just<T> {
  return (val as Just<T>).value !== null;
}

export type Maybe<T> = Just<T> | Nothing;

export function fmapMaybe<A, B>(v: Maybe<A>, func: (a: A) => B, ): Maybe<B> {
  if (isNothing(v)) return Nothing;
  return Just(func(v.value));
}

// Monad laws: return :: a -> m a
// Just<T> (above) already does this!
export function returnMaybe<A>(a: A): Maybe<A> { return Just(a) }

export function bindMaybe<A, B>(v: Maybe<A>, func: (a: A) => Maybe<B>): Maybe<B> {
  if (isNothing(v)) return Nothing;
  return func(v.value);
}

export function liftA2Maybe<A, B, C>(v1: Maybe<A>, func: (a: A, b: B) => C, v2: Maybe<B>): Maybe<C> {
  if (isNothing(v1) || isNothing(v2)) return Nothing;
  return Just(func(v1.value, v2.value));
}

export function ignoreMaybe<A, B>(v: Maybe<A>, func: (a: A) => B): Maybe<A> {
  if (isNothing(v)) return Nothing;
  func(v.value);
  return v;
}

export function predicateMaybe<A>(v: Maybe<A>, predicate: (a: A) => boolean): Maybe<A> {
  if (isNothing(v) || !predicate(v.value)) return Nothing;
  return v;
}

export function undefinedToMaybe<A, B>(v: A, func: (a: A) => B | undefined): Maybe<B> {
  let val = func(v);
  if (val === undefined) return Nothing;
  return Just(val);
}

export function findMaybe<A>(as: A[] | undefined, predicate: (a: A) => boolean): Maybe<A> {
  if (as === undefined) return Nothing;
  return undefinedToMaybe((a: A) => predicate(a), (v) => as.find(v));
}