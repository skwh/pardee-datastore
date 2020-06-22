import { Category, SeriesRef } from '../models/Category.model'
import { Series } from '../models/Series.model'
import { Group } from '../models/Group.model'
import { ColumnNameMap } from '../models/ColumnNameMap.model'
/**
 * Add the group, series, and category property to the Express Request object.
 * This is so that param pre-routing will work correctly: when a param is detected,
 * the application attempts to parse the param. If the param does not exist, the router
 * throws a 404, otherwise, the object is attached to the request object and used by
 * other middleware methods down the line.
 */
declare module 'express-serve-static-core' {
  export interface Request {
    group: Group;
    series: Series;
    seriesRef: SeriesRef;
    category: Category;
    key: ColumnNameMap;
    cokey: ColumnNameMap;
  }
}