export class Series {
  name: string
  category: string
  location: string
  groupName?: string
  group?: Group
  units?: string
  description?: string
  other?: any

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
  other?: any;
}

export class Group {
  name: string
  series: Series[]
  anchorVal: string | number
  domainKeyValues?: { [key: string]: string[] }

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
