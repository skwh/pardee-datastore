import { range_spread, has_prop } from '../utils';
import { Series, Group, Category } from "../models/Series";
import { SettingsError } from "../models/SettingsError";
import { make_postgres_type } from "../db/db";
import { handle_template_generation } from "./template";

/**
 * The different sections that may be present in a settings yml file.
 */
export enum Settings_Sections_Values {
  TEMPLATE = "template",
  GROUPS = "groups",
  COLUMNS = "columns"
}

/**
 * MANY : multiple columns are generated based on a numeric spread in the name field.
 *          generally used to fill date ranges for years.
 */
export enum Column_Modifier_Values {
  MANY = "many"
}

/**
 * KEY : this column makes up the "domain" of the dataset. It is a value that a user
 *          would be searching against. It would be a keyed column in a standard RDBMS.
 * RANGE : this column contains datapoints for every item in the "domain". Generally represents a
 *          certain measurement or slice between data.
 * SPECIAL : this column contains the same type of data as RANGE, but is distinct in some way. 
 * ANCHOR : this column has the same value for the entire table.
 */
export enum Column_Label_Values {
  KEY = "key",
  SPECIAL = "special",
  RANGE = "range",
  ANCHOR = "anchor"
}

/**
 * Currently, only two datatypes are supported: strings and numbers.
 */
export enum Postgres_Type {
  STRING = 'character varying',
  NUMBER = 'double precision'
}

/**
 * How a column is specified in the settings file.
 * name : name of the column.
 * type : datatype for the column's values.
 * label : label for the column (see above).
 * modifier : modifier for the column (see above).
 */
export interface ColumnSettings {
  name: string;
  type: string;
  label: Column_Label_Values;
  modifier: Column_Modifier_Values | undefined;
}

/**
 * Because some column names might need to be changed, 
 * keep the changes recorded in this object.
 */
export interface ColumnNameMap {
  original: string;
  alias: string;
}

/**
 * How a column appears to the program after the settings file has been parsed.
 */
export interface ColumnInfo {
  nameMap: ColumnNameMap;
  type: Postgres_Type;
  label: Column_Label_Values;
}

/**
 * An object which holds the string names of each column which have been assigned
 * to each avaliable label.
 */
export type LabelList = {
  [key in Column_Label_Values]: ColumnNameMap[]
}

export function find_object_in_label_list(labelType: Column_Label_Values, list: LabelList, alias: string): ColumnNameMap {
  return list[labelType].find(o => o.alias === alias);
}

export function make_series_name(series: Series): string {
  return `Series_${series.groupName.split(" ").join("")}_${series.name.split(" ").join("")}`;
}

export function modify_column_name(name: string): string {
  if (/^\d+/.test(name)) {
    return "n" + name;
  }
  return name;
}

function make_info(settings: ColumnSettings): ColumnInfo {
  const name = settings.name.toLowerCase();
  return {
    nameMap: {
      original: settings.name,
      alias: name
    },
    type: make_postgres_type(settings.type),
    label: settings.label
  } as ColumnInfo;
}

function make_info_from_spread(settings: ColumnSettings): ColumnInfo[] {
  return range_spread(settings.name).map(n => {
    const nstr: string = n.toString();
    return {
      nameMap: {
        alias: modify_column_name(nstr),
        original: nstr
      },
      type: make_postgres_type(settings.type),
      label: settings.label
    }
  });
}

/**
 * Given the settings in the yml file, create a ColumnInfo object.
 * Because this application supports the "spread" modifier, it is possible
 * that many internal ColumnInfo objects are generated from one 
 * external ColumnSettings object. So if there is no modifier, this method
 * returns a singleton array of ColumnInfo objects.
 * @param c The column settings object from settings.yml
 */
function make_info_from_column(c: ColumnSettings): ColumnInfo[] {
  if (has_prop(c, 'modifier') && c.modifier == Column_Modifier_Values.MANY) {
    return make_info_from_spread(c);
  } else {
    return [make_info(c)];
  }
}

export function get_column_info(loadedYaml: unknown): ColumnInfo[] {
  if (!has_prop(loadedYaml, Settings_Sections_Values.COLUMNS)) {
    throw new SettingsError('Improper formatting: missing "columns" section');
  }
  const columns = loadedYaml[Settings_Sections_Values.COLUMNS];
  const info: ColumnInfo[] = [];
  columns.forEach((c: ColumnSettings) => {
    info.push(...make_info_from_column(c));
  })
  return info;
}


/**
 * Create groups of series given a list of series objects.
 * @param series 
 */
function sort_into_groups(series: Series[]): Group[] {
  const groups: Record<string, Group> = {};
  for (let i = 0; i < series.length; i++) {
    const current_series = series[i];
    if (has_prop(groups, current_series.groupName)) {
      current_series.group = groups[current_series.groupName];
      groups[current_series.groupName].addSeries(current_series);
    } else {
      const grp = new Group(current_series.groupName, current_series.groupName);
      groups[current_series.groupName] = grp;
    }
  }
  return Object.values(groups);
}

function generate_groups_from_settings(yaml: unknown): Group[] {
  const groups: Group[] = yaml[Settings_Sections_Values.GROUPS];
  groups.map(g => {
    g.series.map(s => {
      s.table_name = make_series_name(s);
      s.row_count = 0;
      return s;
    });
    return g;
  });
  return groups;
}

export async function create_group_list(config_absolute_path: string, loadedYaml: unknown): Promise<Group[]> {
  if (has_prop(loadedYaml, Settings_Sections_Values.TEMPLATE)) {
    return sort_into_groups(await handle_template_generation(config_absolute_path, loadedYaml));
  } else if (has_prop(loadedYaml, Settings_Sections_Values.GROUPS)) {
    return Promise.resolve(generate_groups_from_settings(loadedYaml));
  } else {
    throw new SettingsError(SettingsError.MISSING_DATA_SECTION_ERROR);
  }
}

export function column_values_to_name_maps(vs: string[]): ColumnNameMap[] {
  return vs.map(v => {
    return {
      original: v,
      alias: modify_column_name(v.split(" ").join(""))
    }
  });
}

export function make_categories_from_groups(groups: Group[]): Category[] {
  const categories: Record<string, Category> = {};
  for (let i = 0; i < groups.length; i++) {
    const current_group = groups[i];
    for (let j = 0; j < current_group.series.length; j++) {
      const current_series = current_group.series[j];
      const category_name = current_series.category;
      if (has_prop(categories, category_name)) {
        categories[category_name].addSeries(current_series);
      } else {
        categories[category_name] = new Category(category_name);
        categories[category_name].addSeries(current_series);
      }
    }
  }

  return Object.values(categories);
}