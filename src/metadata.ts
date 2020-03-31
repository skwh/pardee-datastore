import path from "path";
import fs from "fs";

import { Group } from "./models/Series";
import { ApplicationConfig } from './models/ApplicationData';
import { load_yaml } from './utils';
import { Database } from './db/db';
import { SettingsError } from "./models/SettingsError";
import { 
  get_column_info,
  create_group_list, 
  make_series_name,
  ColumnInfo,
  Column_Label_Values,
  ColumnNameMap,
  column_values_to_name_maps,
  make_categories_from_groups,
} from "./settings/parse";

interface LoadFlags {
  clear_old: boolean;
  strict: boolean;
}

interface LoadDeps {
  database: Database;
  columnInfo: ColumnInfo[];
  config: ApplicationConfig;
  groups: Group[];
  configPath: string;
}

function retrieve_labeled_column_names(c: ColumnInfo[], label: Column_Label_Values): ColumnNameMap[] {
  return c.filter(v => v.label == label).map(v => v.nameMap);
}

function make_config(groups: Group[], columns: ColumnInfo[]): ApplicationConfig {
  return {
    groups: groups,
    categories: make_categories_from_groups(groups),
    labels: {
      key: retrieve_labeled_column_names(columns, Column_Label_Values.KEY),
      special: retrieve_labeled_column_names(columns, Column_Label_Values.SPECIAL),
      range: retrieve_labeled_column_names(columns, Column_Label_Values.RANGE),
      anchor: retrieve_labeled_column_names(columns, Column_Label_Values.ANCHOR),
    }
  };
}

async function load_series_in_group(group: Group, load_deps: LoadDeps, load_flags: LoadFlags): Promise<void> {
  const { config, configPath, columnInfo, database } = load_deps;

  for (let i = 0; i < group.series.length; i++) {
    const current_series = group.series[i];

    const series_file_location = path.join(configPath, current_series.location);
    const series_file_exists = fs.existsSync(series_file_location);

    if (!series_file_exists) {
      if (load_flags.strict) {
        throw SettingsError.FILE_NOT_FOUND_ERROR(series_file_location);
      } else {
        console.warn(`File for series ${current_series.name} at ${series_file_location} does not exist! Skipping...`);
        continue;
      }
    }

    current_series.table_name = make_series_name(current_series);
    let load_csv = false;

    try {
      // Assume the table does not already exist.
      await database.make_table(current_series.table_name, columnInfo);
      load_csv = true;
    } catch (error) {
      // If it does, only delete and recreate it if the clear_old flag is active.
      if (load_flags.clear_old) {
        await database.drop_table(current_series.table_name);
        await database.make_table(current_series.table_name, columnInfo);
        load_csv = true;
      }
    }
    // if the table was created, or re-created, re-load the csv.
    if (load_csv) {
      await database.load_from_csv(current_series.table_name, series_file_location);
    }

    console.info("Loaded series", current_series.table_name);

    // Only load domain keys from the first table examined in the group.
    if (i == 0) {
      for (let k = 0; k < config.labels.key.length; k++) {
        const current_key = config.labels.key[k].alias;
        const domain_values = await database.get_domain_values(current_series.table_name, current_key);
        group.domainKeyValues[current_key] = column_values_to_name_maps(domain_values);
      }
    }
  }
}

export async function load_metadata_to_table(database: Database, configPath: string, clear_old: boolean, strict: boolean): Promise<ApplicationConfig> {
  const settings_path: string = path.join(configPath, 'settings.yml');

  try {
    const settings = load_yaml(settings_path);

    const columnInfo = get_column_info(settings);
    const groups = await create_group_list(configPath, settings);

    const config = make_config(groups, columnInfo);

    const loadDeps = {
      database: database,
      columnInfo: columnInfo,
      groups: groups,
      config: config,
      configPath: configPath
    }

    for (let i = 0; i < groups.length; i++) {
      const current_group = groups[i];

      await load_series_in_group(current_group, loadDeps, { clear_old: clear_old, strict: strict });
      console.info("Loaded group", current_group.name);
    }

    return config;

  } catch (error) {
    console.error(error);
    return null;
  }
}


