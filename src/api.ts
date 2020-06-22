import { ColumnNameMap } from './models/ColumnNameMap.model'

export enum Response_Category {
  Keys = 'keys',
  Values = 'values',
  Range = 'range',
  Special = 'special',
  Groups = 'groups',
  Dataseries = 'dataseries',
  Categories = 'categories',
  Cokeys = 'cokeys',
}

export type Response = {
  [key in Response_Category]?: ColumnNameMap[]
};

export function make_response(category: Response_Category, 
                              values: string[]): 
                              Response;
export function make_response(category: Response_Category, 
                              values: ColumnNameMap[]): 
                              Response;
export function make_response(category: Response_Category, 
                              values: any): 
                              Response {
  const res: Response = {}
  // Typescript function overloading: test type of element in values
  if (typeof values[0] === 'string') {
    res[category] = values.map((v: string) => {
      return {
        alias: v,
        original: v
      }
    })
  } else if (typeof values[0] === 'object') {
    res[category] = values
  }
  
  return res
}

