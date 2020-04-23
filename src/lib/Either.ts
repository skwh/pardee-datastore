/**
 * @description The Either type in Typescript. August 2019
 * @author Evan Derby (evan.derby@du.edu)
 */

interface Left<A> {
  value: A;
  form: 'left'
};

interface Right<B> {
  value: B;
  form: 'right'
};

type Either<A, B> = Left<A> | Right<B>;

function isLeft<A>(val: Either<A, any>): val is Left<A> {
  if ((val as Left<A>).form === 'left') return true;
  return false;
}

function isRight<B>(val: Either<any, B>): val is Right<B> {
  if ((val as Right<B>).form === 'right') return true;
  return false;
}

function Left<A, B>(val: A): Either<A, B> {
  return { value: val, form: 'left' };
}

function Right<A, B>(val: B): Either<A, B> {
  return { value: val, form: 'right' };
}

function eitherBind<A, B, C>(func: (b: B) => Either<A, C>, val: Either<A, B>): Either<A, C> {
  if (isLeft(val)) return val;
  return func(val.value);
}

function eitherMap<A, B, C>(func: (b: B) => C, val: Either<A, B>): Either<A, C> {
  if (isLeft(val)) return val;
  return Right(func(val.value));
}