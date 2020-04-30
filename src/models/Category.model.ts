import { Series } from './Series.model';
import { ColumnNameMap } from './ColumnNameMap.model';
import { sanitize_name } from '../utils';

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