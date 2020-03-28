import path from "path";

import { Series, Group } from "../models/Series";
import { allOf, load_csv, has_prop } from "../utils";
import { Settings_Sections_Values } from "./parse";
import { SettingsError } from "../models/SettingsError";

/*
  A template is a way for a user to create multiple groups and dataseries
  given a master list (also a csv file). The template consists of three parts:
  path: the path to the master list
  columns: a list of the column names in the master list.
  dataseries: A templated dataseries, where column names of the 
              master list can stand in for values for each dataseries. 
*/
interface TemplateFormat {
  path: string;
  columns: string[];
  dataseries: Series;
}

const TEMPLATE_FORMAT_REQUIRED_FIELDS: string[] = [
  'path',
  'columns',
  'dataseries'
];

/**
 * Replace strings enclosed with curly brackets with given values.
 * @param vars A map of variable names and their values
 * @param template A string which might contain curly brackets (handlebars).
 * @returns A string with any replacements made.
 */
export function handlebars_replace(vars: { [key: string]: string }, template: string): string {
  const handlebar_regex = /{w+}/gi;
  const matches = handlebar_regex.exec(template);

  if (matches === null) {
    return template;
  }
  let final = template;

  for (let i = 1; i < matches.length; i++) {
    const matched_string = matches[i];
    if (has_prop(vars,matched_string)) {
      final = final.replace(matched_string, vars[matched_string]);
    } else {
      throw new SettingsError(`Encountered unknown variable "${matched_string}" when parsing dataseries template.`);
    }
  }

  return final;
}

/**
 * Ensure that a yaml object is a valid templatef format object.
 * @param yaml An object read from a yaml file.
 */
function verify_template_format(yaml: any): boolean {
  return allOf((prop: string) => has_prop(yaml, prop), TEMPLATE_FORMAT_REQUIRED_FIELDS);
}

/**
 * The application generates a list of series from a template by:
 * 1. reading the master list file
 * 2. creating a dictionary of possible handlebars keys, using the given column names
 * 3. for each row of the master list, create a series object which has any handlebars values replaced with the row value of that column
 * 4. return the created rows.
 * @param config_absolute_path Path to the master list file.
 * @param template A template format object, derived from the yaml.
 */

async function generate_series_from_template(config_absolute_path: string, template: TemplateFormat): Promise<Series[]> {
  // Read the master list file.
  const template_data = await load_csv(path.join(config_absolute_path, template.path));
  // load_csv returns a list of objects with each key of the object 
  //  being a name of a column, and each value being the value of the row at
  //  that column.
  const template_series = template.dataseries;
  const series: Series[] = [];
  const keys = {};

  template.columns.forEach(k => keys[k] = "");

  for (let i = 0; i < template_data.length; i++) {
    const current_row = template_data[i];
    const row_keys_values = Object.assign({}, keys);
    Object.keys(current_row).forEach(k => {
      row_keys_values[k] = current_row[k];
    });
    const new_series = new Series();
    for (const [key, value] of Object.entries(template_series)) {
      new_series[key] = handlebars_replace(row_keys_values, value);
    }
    console.log(new_series);
    series.push(new_series);
  }

  return series;
}

export async function handle_template_generation(config_absolute_path: string, yaml: any): Promise<Series[]> {
  const template: TemplateFormat = yaml[Settings_Sections_Values.TEMPLATE];
  if (!verify_template_format(template)) {
    throw new SettingsError(SettingsError.MALFORMED_TEMPLATE_ERROR);
  }
  return await generate_series_from_template(config_absolute_path, template);
}