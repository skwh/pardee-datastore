import yaml from "js-yaml";
import fs from "fs";

import { range_spread } from '../utils';
import { Series } from "../models/Series";
import { SettingsError } from "../models/SettingsError";
import { make_postgres_type } from "../db/db";

/**
 * The different sections that may be present in a settings yml file.
 */
export enum SETTINGS_SECTIONS_VALUES {
  DATASERIES = "dataseries",
  COLUMNS = "columns"
};

/**
 * MANY : multiple columns are generated based on a numeric spread in the name field.
 *          generally used to fill date ranges for years.
 */
export enum COLUMN_MODIFIER_VALUES {
  MANY = "many"
}

/**
 * KEY : this column makes up the "domain" of the dataset. It is a value that a user
 *          would be searching against. It would be a keyed column in a standard RDBMS.
 * RANGE : this column contains datapoints for every item in the "domain". Generally represents a
 *          certain measurement or slice between data.
 * SPECIAL : this column contains the same type of data as RANGE, but is distinct in some way. 
 */
export enum COLUMN_LABEL_VALUES {
  KEY = "key",
  SPECIAL = "special",
  RANGE = "range"
}

/**
 * Currently, only two datatypes are supported: strings and numbers.
 */
export enum POSTGRES_TYPE {
  STRING = 'character varying',
  NUMBER = 'double precision'
}

export type LabelList = {
  [key in COLUMN_LABEL_VALUES]: string[]
};

/**
 * How a column is specified in the settings file.
 * name : name of the column.
 * type : datatype for the column's values.
 * label : label for the column (see above).
 * modifier : modifier for the column (see above).
 */
export interface ColumnSettings {
  name: string
  type: string
  label: COLUMN_LABEL_VALUES
  modifier: COLUMN_MODIFIER_VALUES | undefined
}

/**
 * How a column appears to the program after the settings file has been parsed.
 */
export interface ColumnInfo {
  name: string,
  type: POSTGRES_TYPE,
  label: COLUMN_LABEL_VALUES
};


export function load_yaml(path: string): any {
  return yaml.safeLoad(fs.readFileSync(path, 'utf8'));
}

export function make_series_name(series: Series): string {
  return `Series_${series.category}_${series.name.split(" ").join("")}`;
}


export function modify_column_name(name: string): string {
  if (/\d{4}/.test(name)) {
    return "Year_" + name;
  }
  return name;
}

export function get_column_info(loadedYaml: any): ColumnInfo[] {
  if (!loadedYaml.hasOwnProperty(SETTINGS_SECTIONS_VALUES.COLUMNS)) {
    throw new SettingsError('Improper formatting: missing "columns" section');
  }
  let columns = loadedYaml[SETTINGS_SECTIONS_VALUES.COLUMNS];
  let info: ColumnInfo[] = [];
  columns.forEach((c: ColumnSettings) => {
    info.push(...make_info_from_column(c));
  })
  return info;
}

export function cast_to_dataseries_settings(loadedYaml: any): Series[] {
  if (!loadedYaml.hasOwnProperty(SETTINGS_SECTIONS_VALUES.DATASERIES)) {
    throw new SettingsError('Improper formatting: missing "dataseries" section');
  }
  let series: Series[] = loadedYaml[SETTINGS_SECTIONS_VALUES.DATASERIES];
  series.map(s => {
    s['table_name'] = make_series_name(s);
    s['row_count'] = 0;
    return s;
  });
  return series;
}

function make_info_from_column(c: ColumnSettings): ColumnInfo[] {
  if (c.hasOwnProperty('modifier') && c.modifier == COLUMN_MODIFIER_VALUES.MANY) {
    return range_spread(c['name']).map(n => {
      return {
        name: modify_column_name(n.toString()),
        type: make_postgres_type(c.type),
        label: c.label
      }
    });
  } else {
    return [{
      name: c.name.toLowerCase(),
      type: make_postgres_type(c.type),
      label: c.label
    }]
  }
}

