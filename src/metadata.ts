import path from "path";
import fs from "fs";

import { Maybe, Just, Nothing } from './lib/Maybe';

import { Group, Series } from "./models/Series";
import { ApplicationConfig } from './models/ApplicationData';
import { load_yaml, has_prop } from './utils';
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
  only_clear: boolean;
}

export function retrieve_labeled_columns(c: ColumnInfo[], label: Column_Label_Values): ColumnInfo[] {
  return c.filter(v => v.label == label);
}

export function retrieve_labeled_column_names(c: ColumnInfo[], label: Column_Label_Values): ColumnNameMap[] {
  return retrieve_labeled_columns(c, label).map(v => v.nameMap);
}

export function remove_name_map_duplicates(columns: ColumnNameMap[]): ColumnNameMap[] {
  const rec: Record<string, ColumnNameMap> = {};
  for (const column of columns) {
    if (!has_prop(rec, column.original)) {
      rec[column.original] = column;
    }
  }
  return Object.values(rec);
}

export class MetadataLoader {
  loadFlags: LoadFlags;
  database: Database;
  configPath: string;
  settingsPath: string;

  columnInfo: ColumnInfo[];
  groups: Group[];
  config: ApplicationConfig;

  constructor(database: Database, config_path: string, load_flags: LoadFlags) {
    this.loadFlags = load_flags;
    this.database = database;
    this.configPath = config_path;
    this.settingsPath = path.join(config_path, 'settings.yml');
  }

  private make_config(): ApplicationConfig {
    return {
      groups: this.groups,
      categories: make_categories_from_groups(this.groups),
      labels: {
        key: retrieve_labeled_column_names(this.columnInfo, Column_Label_Values.KEY),
        cokey: retrieve_labeled_column_names(this.columnInfo, Column_Label_Values.COKEY),
        special: retrieve_labeled_column_names(this.columnInfo, Column_Label_Values.SPECIAL),
        range: retrieve_labeled_column_names(this.columnInfo, Column_Label_Values.RANGE),
        anchor: retrieve_labeled_column_names(this.columnInfo, Column_Label_Values.ANCHOR),
      }
    };
  }

  private async only_clear(series: Series): Promise<void> {
    try {
      await this.database.drop_table(series.table_name);
      console.info(`Dropped table ${series.table_name}`);

      await this.database.drop_index(series.table_name);
      console.info(`Dropped index for table ${series.table_name}`);
    } catch (e) {
      // Do nothing.
    }
  }
  
  private async make_or_recreate_table(series: Series): Promise<boolean> {
    try {
      // Assume the table does not already exist.
      await this.database.make_table(series.table_name, this.columnInfo);
      return true;
    } catch (error) {
      // If it does, only delete and recreate it if the clear_old flag is active.
      if (this.loadFlags.clear_old) {
        await this.database.drop_table(series.table_name);
        await this.database.make_table(series.table_name, this.columnInfo);
        return true;
      }
    }
    return false;
  }

  private async make_or_recreate_index(series: Series, index_columns: ColumnInfo[]): Promise<boolean> {
    try {
      // Assume the index does not already exist.
      await this.database.make_index(series.table_name, index_columns);
      return true;
    } catch (error) {
      if (this.loadFlags.clear_old) {
        await this.database.drop_index(series.table_name);
        await this.database.make_index(series.table_name, index_columns);
        return true;
      }
    }
    return false;
  }

  private async get_domain_values_from_table(series: Series, group: Group): Promise<void> {
    for (const { alias } of this.config.labels.key) {
      const domain_values = await this.database.get_domain_values(series.table_name, alias);
      group.domainKeyValues[alias] = remove_name_map_duplicates(column_values_to_name_maps(domain_values));
    }

    for (const { alias } of this.config.labels.cokey) {
      const cokey_values = await this.database.get_domain_values(series.table_name, alias);
      group.domainKeyValues[alias] = remove_name_map_duplicates(column_values_to_name_maps(cokey_values));
    }
  }

  private async load_series_in_group(group: Group): Promise<boolean> {
    for (const [index, current_series] of group.series.entries()) {

      const series_file_location = path.join(this.configPath, current_series.location);
      const series_file_exists = fs.existsSync(series_file_location);

      if (!series_file_exists) {
        if (this.loadFlags.strict) {
          throw SettingsError.FILE_NOT_FOUND_ERROR(series_file_location);
        } else {
          console.warn(`File for series ${current_series.name} at ${series_file_location} does not exist! Skipping...`);
          continue;
        }
      }

      current_series.table_name = make_series_name(current_series);

      const domain_key_columns = retrieve_labeled_columns(this.columnInfo, Column_Label_Values.KEY);
      const domain_cokey_columns = retrieve_labeled_columns(this.columnInfo, Column_Label_Values.COKEY);

      const index_columns = domain_key_columns.concat(domain_cokey_columns);

      if (this.loadFlags.only_clear) {
        this.only_clear(current_series);
        continue;
      }

      const table_action_performed = await this.make_or_recreate_table(current_series);
      const index_action_performed = await this.make_or_recreate_index(current_series, index_columns);

      // if the table was created, or re-created, re-load the csv.
      if (table_action_performed) {
        console.info(`Reloading CSV for table ${current_series.table_name}`);
        await this.database.load_from_csv(current_series.table_name, series_file_location);
      }
      if (index_action_performed) {
        console.info(`Created index for table ${current_series.table_name}`);
      }

      // Only load domain & co- keys from the first table examined in the group.
      if (index == 0) {
        this.get_domain_values_from_table(current_series, group);
        console.info(`Loaded key and cokey values for group ${group.name}`);
      }

      console.info("Loaded series", current_series.table_name);
    }
    
    return true;
  }

  async load_metadata_to_table(): Promise<Maybe<ApplicationConfig>> {
    try {
      const settings = load_yaml(this.settingsPath);

      this.columnInfo = get_column_info(settings);
      this.groups = await create_group_list(this.configPath, settings);

      this.config = this.make_config();

      for (const group of this.groups) {
        await this.load_series_in_group(group);
        console.info("Loaded group", group.name);
      }
      if (this.loadFlags.only_clear) {
        return Nothing;
      }

      return Just(this.config);

    } catch (error) {
      console.error(error);
      return Nothing;
    }
  }
}


