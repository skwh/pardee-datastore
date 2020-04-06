import { ColumnNameMap, sanitize_name } from "../settings/parse"

export type SeriesDomainType = "monadic" | "dyadic";

export class Series {
  name: string
  category: string
  location: string
  type?: SeriesDomainType
  groupName?: string
  group?: Group
  units?: string
  description?: string
  other?: unknown

  // generated properties
  slug?: string
  table_name?: string
  row_count?: number

  constructor() {
    this.name = "";
    this.category = "";
    this.location = "";
  }
}

// A series template, where some names are changed and all types are string
export interface TemplateSeries {
  name: string;
  category: string;
  group: string;
  location: string;
  units?: string;
  description?: string;
  other?: unknown;
}

export class Group {
  name: string
  series: Series[]
  anchorVal: string | number
  domainKeyValues?: Record<string, ColumnNameMap[]>

  constructor(name: string, anchorVal: string | number) {
    this.series = [];
    this.name = name;
    this.anchorVal = anchorVal;
    this.domainKeyValues = {};
  }

  addSeries(series: Series): number {
    series.group = this;
    series.groupName = this.name;
    this.series.push(series);
    return this.series.length;
  }
}

export class Category {
  name: ColumnNameMap
  series: Series[]

  constructor(name: string) {
    this.name = {
      original: name,
      alias: sanitize_name(name)
    }
    this.series = [];
  }

  addSeries(series: Series): number {
    return this.series.push(series);
  }
}