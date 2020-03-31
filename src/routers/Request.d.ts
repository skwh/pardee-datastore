import { Group, Series } from '../models/Series';

declare module 'express-serve-static-core' {
  export interface Request {
    group: Group;
    series: Series;
  }
}