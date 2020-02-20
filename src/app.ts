import path from "path";
import fs from "fs";

import yaml from "js-yaml";
import csvParser from "csv-parser";

import read_n_lines from "./readNLines";
import { make_table, make_column_info, load_from_csv } from './loadToDb';

const CONFIG_FOLDER : string = '../test-config';
const TEST_PROPERTY : string = 'dataseries';

(async () => {
  let config_folder : string = path.join(__dirname, CONFIG_FOLDER, 'settings.yml');

  try {
    let settings = yaml.safeLoad(fs.readFileSync(config_folder, 'utf8'));

    let dataseries : Series[] = cast_to_dataseries_settings(settings).dataseries;
    
    dataseries.forEach(async (current_series : Series) => {
      let series_file_location = path.join(__dirname, current_series.location);
      let file_lines = await read_n_lines(series_file_location, 2);
      console.log(file_lines);
    });

  } catch (error) {
    console.error(error);
  }
})();

class Series {
  name: string
  category: string
  location: string
  units: string
  table_name : string | undefined
  row_count : number | undefined
  parsed : boolean = false;
  loaded : boolean = false;
}

interface DataseriesSettings {
  dataseries : Series[]
}

function make_series_name(series) {
  return `Series_${series.category}_${series.name.split(" ").join("")}`;
}

function cast_to_dataseries_settings(loadedYaml : any) : DataseriesSettings {
  if (!loadedYaml.hasOwnProperty(TEST_PROPERTY)) {
    throw new Error('Dataseries Settings file is improperly formatted');
  }
  let series : Series[] = loadedYaml['dataseries'];
  series.map(s => {
    s['table_name'] = make_series_name(s);
    s['row_count'] = 0;
    return s;
  });
  return {
    dataseries: series
  };
}