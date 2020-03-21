import { ColumnNameMap } from "./settings/parse";

export enum Response_Category {
  Keys = "keys",
  Values = "values",
  Range = "range",
  Special = "special",
}

/*
  Some values might have been changed to be in a machine readable format.
  So, to each client, provide the original, human-written name, 
  as well as the machine reabable format, for use in queries, usw. 
*/

export interface AliasGroup {
  original: string
  alias: string
}

export type Response = {
  [key in Response_Category]?: AliasGroup[]
};

export function make_response(category: Response_Category, values: string[]) : Response;
export function make_response(category: Response_Category, values: ColumnNameMap[]) : Response;
export function make_response(category: Response_Category, values): Response {
  let res: Response = {};
  // Typescript function overloading: test type of element in values
  if (typeof values[0] === "string") {
    res[category] = values.map(v => {
      return {
        alias: v.name,
        original: v.name
      }
    });
  } else if (typeof values[0] === "object") {
    res[category] = values.map(v => {
      if (v.original) {
        return {
          original: v.original,
          alias: v.name
        }
      } else {
        return {
          alias: v.name,
          original: v.name
        }
      }
    });
  }
  
  return res;
}

