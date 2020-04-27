/**
 * @description The Either type in Typescript. August 2019
 * @author Evan Derby (evan.derby@du.edu)
 */

export interface Left<A> {
  value: A;
  form: 'left'
};

export interface Right<B> {
  value: B;
  form: 'right'
};

export type Either<A, B> = Left<A> | Right<B>;

export function isLeft<A>(val: Either<A, any>): val is Left<A> {
  if ((val as Left<A>).form === 'left') return true;
  return false;
}

export function isRight<B>(val: Either<any, B>): val is Right<B> {
  if ((val as Right<B>).form === 'right') return true;
  return false;
}

export function Left<A, B>(val: A): Either<A, B> {
  return { value: val, form: 'left' };
}

export function Right<A, B>(val: B): Either<A, B> {
  return { value: val, form: 'right' };
}

export function eitherBind<A, B, C>(func: (b: B) => Either<A, C>, val: Either<A, B>): Either<A, C> {
  if (isLeft(val)) return val;
  return func(val.value);
}

export function eitherMap<A, B, C>(func: (b: B) => C, val: Either<A, B>): Either<A, C> {
  if (isLeft(val)) return val;
  return Right(func(val.value));
}