import { Maybe, Just, Nothing, isNothing } from './lib/Maybe'

import { Group } from './models/Group.model'
import { Series } from './models/Series.model'
import { ApplicationConfig } from './models/ApplicationData'
import { has_prop, sanitize_name } from './utils'
import { Database } from './db/db'
import { Column_Label_Values } from './models/ColumnValues.enum'
import { ColumnNameMap } from './models/ColumnNameMap.model'
import { Category } from './models/Category.model'
import { ParsedColumn, ParsedGroup, ParsedSettingsData } from './models/parsed/Parsed.model'

interface LoadFlags {
  clear_old: boolean;
  strict: boolean;
  only_clear: boolean;
}

export function retrieve_labeled_columns(c: ParsedColumn[], 
                                         label: Column_Label_Values): 
                                         ParsedColumn[] {
  return c.filter(v => v.label == label)
}

export function retrieve_labeled_column_names(c: ParsedColumn[], 
                                              label: Column_Label_Values): 
                                              ColumnNameMap[] {
  return retrieve_labeled_columns(c, label).map(v => v.nameMap)
}

export function remove_name_map_duplicates(columns: ColumnNameMap[]): 
                                                              ColumnNameMap[] {
  const rec: Record<string, ColumnNameMap> = {}
  for (const column of columns) {
    if (!has_prop(rec, column.original)) {
      rec[column.original] = column
    }
  }
  return Object.values(rec)
}

function transform_to_group(group: ParsedGroup): Group {
  return {
    name: group.name,
    dataseries: group.dataseries,
    domain_keys: {},
    codomain_keys: {},
    combined_key_values: []
  }
}

function column_values_to_name_maps(vs: string[]): ColumnNameMap[] {
  return vs.map(v => {
    return {
      original: v,
      alias: sanitize_name(v)
    }
  })
}

function create_categories_if_exists(groups: Group[]): Maybe<Category[]> {
  const categories: Record<string, Category> = {}
  for (const current_group of groups) {
    for (const current_series of current_group.dataseries) {
      if (current_series.category === undefined) {
        return Nothing
      }
      const category_name = current_series.category
      if (has_prop(categories, category_name)) {
        categories[category_name].addSeries(current_series)
      } else {
        categories[category_name] = new Category(category_name)
        categories[category_name].addSeries(current_series)
      }
    }
  }

  return Just(Object.values(categories))
}

export class MetadataLoader {
  loadFlags: LoadFlags;
  database: Database;
  settings: ParsedSettingsData;
  configPath: string;
  fullGroups: Group[];
  shared_column_names: string[];


  constructor(database: Database, 
              settings: ParsedSettingsData, 
              config_path: string, 
              load_flags: LoadFlags) {
    this.loadFlags = load_flags
    this.database = database
    this.settings = settings
    this.configPath = config_path
    this.fullGroups = []
    this.shared_column_names = settings.columns.map(c => c.nameMap.alias)
  }

  private async only_clear(series: Series): Promise<void> {
    try {
      await this.database.drop_table(series.table_name)
      console.info(`Dropped table ${series.table_name}`)

      await this.database.drop_index(series.table_name)
      console.info(`Dropped index for table ${series.table_name}`)
    } catch (e) {
      // Do nothing.
    }
  }
  
  private async make_or_recreate_table(series: Series): Promise<boolean> {
    try {
      // Assume the table does not already exist.
      await this.database.make_table(series.table_name, this.settings.columns)
      return true
    } catch (error) {
      // If it does, only delete and recreate it if the clear_old flag is active.
      if (this.loadFlags.clear_old) {
        await this.database.drop_table(series.table_name)
        await this.database.make_table(series.table_name, 
                                       this.settings.columns)
        return true
      }
    }
    return false
  }

  private async make_or_recreate_index(series: Series, 
                                       index_columns: ParsedColumn[]): 
                                       Promise<boolean> {
    try {
      // Assume the index does not already exist.
      await this.database.make_index(series.table_name, index_columns)
      return true
    } catch (error) {
      if (this.loadFlags.clear_old) {
        await this.database.drop_index(series.table_name)
        await this.database.make_index(series.table_name, index_columns)
        return true
      }
    }
    return false
  }

  private async get_domain_values_from_table(series: Series, 
                                             group: ParsedGroup): 
                                             Promise<Group> {
    const full_group = transform_to_group(group)

    for (const { alias } of this.settings.labels.key) {
      const domain_values = await this.database
                                   .get_domain_values(series.table_name, alias)
      full_group.combined_key_values.push(...domain_values)
      full_group.domain_keys[alias] = remove_name_map_duplicates(
                                     column_values_to_name_maps(domain_values))
      
      console.info(
        `Loaded domain key values for key ${alias} for group ${full_group.name}`)
    }

    for (const { alias } of this.settings.labels.cokey) {
      const cokey_values = await this.database
                                   .get_domain_values(series.table_name, alias)
      full_group.combined_key_values.push(...cokey_values)
      full_group.codomain_keys[alias] = remove_name_map_duplicates(
                                      column_values_to_name_maps(cokey_values))

      console.info(
        `Loaded codomain key values for key ${alias} for group ${full_group.name}`)
    }
    return full_group
  }

  private async load_series_in_group(group: ParsedGroup): 
                                                        Promise<Maybe<Group>> {
    let full_group: Maybe<Group> = Nothing
    for (const [index, current_series] of group.dataseries.entries()) {

      const series_file_location = current_series.location

      const domain_key_columns = retrieve_labeled_columns(this.settings.columns
                                                     , Column_Label_Values.key)
      const domain_cokey_columns = retrieve_labeled_columns(
                                                    this.settings.columns,
                                                    Column_Label_Values.cokey)

      const index_columns = domain_key_columns.concat(domain_cokey_columns)

      if (this.loadFlags.only_clear) {
        this.only_clear(current_series)
        continue
      }

      const table_action_performed = await this.make_or_recreate_table(
                                                                current_series)
      const index_action_performed = await this.make_or_recreate_index(
                                                                current_series, 
                                                                index_columns)

      // if the table was created, or re-created, re-load the csv.
      if (table_action_performed) {
        console.info(`Loading CSV for table ${current_series.table_name}`)
        await this.database.load_from_csv(current_series.table_name, 
                                                          series_file_location)
      }
      if (index_action_performed) {
        console.info(`Created index for table ${current_series.table_name}`)
      }

      // Only load domain & co- keys from the last table examined in the group.
      if (index == group.dataseries.length - 1) {
        full_group = Just(await this.get_domain_values_from_table(
                                                                current_series, 
                                                                group))
        console.info(`Loaded key and cokey values for group ${group.name}`)
      }

      console.info('Loaded series', current_series.table_name)
    }
    
    return full_group
  }

  async load_metadata_to_table(): Promise<Maybe<ApplicationConfig>> {
    try {
      for (const group of this.settings.groups) {
        const full_group = await this.load_series_in_group(group)
        if (isNothing(full_group)) {
          return Nothing
        }

        this.fullGroups.push(full_group.value)
        console.info('Loaded group', full_group.value.name)
      }
      if (this.loadFlags.only_clear) {
        return Nothing
      }

      const categories_results = create_categories_if_exists(this.fullGroups)

      return Just({
        groups: this.fullGroups,
        shared_column_names: this.shared_column_names,
        categories: isNothing(categories_results)? undefined : 
                                                   categories_results.value,
        labels: this.settings.labels
      })

    } catch (error) {
      console.error(error)
      return Nothing
    }
  }
}


