import { Group, Series, Category } from '../models/Series';

declare module 'express-serve-static-core' {
  export interface Request {
    group: Group;
    series: Series;
    category: Category;
  }
}