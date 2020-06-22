import { Series } from './Series.model'
import { ColumnNameMap } from './ColumnNameMap.model'
import { sanitize_name, has_prop } from '../utils'

export interface SeriesRef {
  name: string;
  groups: Set<string>;
}

export class Category {
  name: ColumnNameMap
  series: Record<string, SeriesRef>

  constructor(name: string) {
    this.name = {
      original: name,
      alias: sanitize_name(name)
    }
    this.series = {}
  }

  addSeries(series: Series): number {
    if (has_prop(this.series, series.name)) {
      this.series[series.name].groups.add(series.group)
    } else {
      this.series[series.name] = {
        name: series.name,
        groups: new Set([series.group])
      }
    }
    return Object.keys(this.series).length
  }
}
