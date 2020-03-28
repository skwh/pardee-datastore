import path from "path";

import { Series, Group } from "./models/Series";
import { load_yaml } from './utils';

import { 
  Database
} from './db/db';

import { 
  get_column_info,
  create_group_list, 
  make_series_name,
  ColumnInfo,
  Column_Label_Values,
  ColumnNameMap,
  LabelList,
} from "./settings/parse";

export interface ApplicationConfig {
  groups: Group[];
  labels: LabelList;
}

function retrieve_labeled_column_names(c: ColumnInfo[], label: Column_Label_Values): ColumnNameMap[] {
  return c.filter(v => v.label == label).map(v => v.nameMap);
}

function make_config(groups: Group[], columns: ColumnInfo[]): ApplicationConfig {
  return {
    groups: groups,
    labels: {
      key: retrieve_labeled_column_names(columns, Column_Label_Values.KEY),
      special: retrieve_labeled_column_names(columns, Column_Label_Values.SPECIAL),
      range: retrieve_labeled_column_names(columns, Column_Label_Values.RANGE),
      anchor: retrieve_labeled_column_names(columns, Column_Label_Values.ANCHOR),
    }
  };
}

export async function load_metadata_to_table(d: Database, config_folder_path: string, clear_old: boolean): Promise<ApplicationConfig> {
  const settings_path: string = path.join(config_folder_path, 'settings.yml');

  try {
    const settings = load_yaml(settings_path);

    const column_info = get_column_info(settings);
    const groups = await create_group_list(config_folder_path, settings);

    const config = make_config(groups, column_info);

    for (let i = 0; i < groups.length; i++) {
      const current_group = groups[i];

      for (let j = 0; j < current_group.series.length; j++) {
        const current_series = current_group.series[i];

        const series_file_location = path.join(__dirname, config_folder_path, current_series.location);

        current_series.table_name = make_series_name(current_series);
        let load_csv = false;

        try {
          // Assume the table does not already exist.
          await d.make_table(current_series.table_name, column_info);
          load_csv = true;
        } catch (error) {
          // If it does, only delete and recreate it if the clear_old flag is active.
          if (clear_old) {
            await d.drop_table(current_series.table_name);
            await d.make_table(current_series.table_name, column_info);
            load_csv = true;
          }
        }
        // if the table was created, or re-created, re-load the csv.
        if (load_csv) {
          await d.load_from_csv(current_series.table_name, series_file_location);
        }

        console.info("Loaded series", current_series.table_name);

        // Only load domain keys from the first table examined in the group.
        if (j == 0) {
          for (let k = 0; k < config.labels.key.length; k++) {
            const current_key = config.labels.key[j].alias;
            const domain_values = await d.get_domain_values(current_series.table_name, current_key);
            console.log("got domain values", domain_values.length);
            current_group.domainKeyValues[current_key] = domain_values;
          }
        }
      }

      console.log("Loaded group", current_group.name);
      

      
    }

    return config;

  } catch (error) {
    console.error(error);
    return null;
  }
}

