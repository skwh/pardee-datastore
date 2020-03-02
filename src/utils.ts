export function range_spread(spread: string): number[] {
  let nums = spread.split('..').map(str => parseInt(str, 10));
  if (nums.length != 2 || anyOf(isNaN, nums)) {
    throw new SyntaxError("Dot range is not properly formatted!");
  }
  let high = nums[1];
  let low = nums[0];
  let ret: number[] = [];
  for (let i = low; i <= high; i++) {
    ret.push(i);
  }
  return ret;
} 

export function range_nums(x : number, y: number) : number[] {
  let ret : number[] = [];
  if (x > y) {
    for (let i = y; i <= x; i++) {
      ret.push(i);
    }
  } else {
    for (let i = x; i <= y; i++) {
      ret.push(i);
    }
  }
  return ret;
}

export function anyOf(predicate: ((x: any) => boolean), xs: any[]): boolean {
  for (let i = 0; i < xs.length; i++) {
    if (predicate(xs[i])) {
      return true;
    }
  }
  return false;
}

export function argsString(max: number) : string {
  return range_nums(1, max).map(n => '$' + n).join(", ");
}