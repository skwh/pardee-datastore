import yaml from "js-yaml";
import fs from "fs";
import csv from "csv-parser";

export function anyOf(predicate: ((x: any) => boolean), xs: any[]): boolean {
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
    throw new SyntaxError("Dot range is not properly formatted!");
  }
  const high = nums[1];
  const low = nums[0];
  const ret: number[] = [];
  for (let i = low; i <= high; i++) {
    ret.push(i);
  }
  return ret;
} 


export function allOf(predicate: ((x: any) => boolean), xs: any[]): boolean {
  for (let i = 0; i < xs.length; i++) {
    if (!predicate(xs[i])) {
      return false;
    }
  }
  return true;
}

export function argsString(max: number): string {
  return range_spread(`1..${max}`).map(n => '$' + n).join(", ");
}


export async function load_csv(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('error', (e) => reject(e))
      .on('end', () => resolve(results));
  });
}

export function load_yaml(path: string): any {
  return yaml.safeLoad(fs.readFileSync(path, 'utf8'));
}

export function has_prop(obj, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}