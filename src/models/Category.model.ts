import { ColumnNameMap, sanitize_name } from '../settings/parse.old';
import { Series } from './Series.model';

export class Category {
  name: ColumnNameMap
  series: Series[]

  constructor(name: string) {
    this.name = {
      original: name,
      alias: sanitize_name(name)
    };
    this.series = [];
  }

  addSeries(series: Series): number {
    return this.series.push(series);
  }
}