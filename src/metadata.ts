import path from "path";

import { Series } from "./models/Series";

import { 
  Database
} from './db/db';

import { 
  get_column_info, 
  load_yaml, 
  cast_to_dataseries_settings, 
  make_series_name,
  LabelList,
  ColumnInfo,
  COLUMN_LABEL_VALUES,
  ColumnNameMap,
} from "./settings/parse";

type LabelKeyName = string;

export interface ApplicationConfig {
  series: Series[]
  labels: LabelList,
  domain: {
    key: LabelKeyName,
    domain_values: string[]
  }[]
}

function retrieve_labeled_column_names(c : ColumnInfo[], label: COLUMN_LABEL_VALUES) : ColumnNameMap[] {
  return c.filter(v => v.label == label).map(v => v.nameMap);
}

function make_config(dataseries: Series[], columns : ColumnInfo[]) : ApplicationConfig {
  return {
    series: dataseries,
    labels: {
      key: retrieve_labeled_column_names(columns, COLUMN_LABEL_VALUES.KEY),
      special: retrieve_labeled_column_names(columns, COLUMN_LABEL_VALUES.SPECIAL),
      range: retrieve_labeled_column_names(columns, COLUMN_LABEL_VALUES.RANGE)
    },
    domain: []
  };
}

export async function load_metadata_to_table(d: Database, config_folder_path: string, clear_old: boolean) : Promise<ApplicationConfig> {
  let config_folder: string = path.join(__dirname, config_folder_path, 'settings.yml');

  try {
    let settings = load_yaml(config_folder);

    let column_info = get_column_info(settings);
    let dataseries = cast_to_dataseries_settings(settings);

    let config = make_config(dataseries, column_info);

    for (let i = 0; i < dataseries.length; i++) {
      let current_series = dataseries[i];
      let series_file_location = path.join(__dirname, config_folder_path, current_series.location);

      current_series.table_name =  make_series_name(current_series);
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
      
      console.info("Loaded series " + current_series.table_name);

      // Only load keys from the first table examined.
      if (i == 0) {
        for (let j = 0; j < config.labels.key.length; j++) {
          let current_key = config.labels.key[j].name;
          let domain_values = await d.get_domain_values(current_series.table_name, current_key);
          console.log("got domain values", domain_values.length);
          config.domain.push({ key: current_key, domain_values: domain_values });
        }
      }
    }

    return config;

  } catch (error) {
    console.error(error);
    return null;
  }
}

