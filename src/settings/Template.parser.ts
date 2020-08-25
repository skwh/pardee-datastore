import path from 'path'

import { Either, Left, Right, isLeft } from '../lib/Either'
import { load_csv, location_exists, zip, has_prop } from '../utils'

import { ParseError } from '../models/error/Parse.error'
import { Template } from '../models/template/Template.model'
import { ParsedGroup } from '../models/parsed/Parsed.model'
import { TemplateSeries } from '../models/template/TemplateSeries.model'
import { Series } from '../models/Series.model'
import { DataseriesParser } from './Dataseries.parser'
import { UnsafeSeries } from '../models/unsafe/Unsafe.model'

type CSV = Record<string, string>[];

function unsafeIsSafe(template: Partial<Template>): template is Template {
  return template.path !== undefined 
      && template.columns !== undefined
      && template.dataseries !== undefined
}

function csv_columns_match_given(csv: CSV, 
                                 columns: string[]): 
                                 Either<ParseError, boolean> {
  const csv_headers = Object.keys(csv[0])
  for (const name of columns) {
    if (!csv_headers.includes(name)) {
      return Left(new ParseError(`A header was specified in the settings which does not appear in the csv! Header: ${name} Searched: ${csv_headers}`))
    }
  }
  return Right(true)
}

/**
 * Create groups of series given a list of series objects.
 * @param series 
 */
export function sort_into_groups(series: Series[]): ParsedGroup[] {
  const groups: Record<string, ParsedGroup> = {}
  for (const current_series of series) {
    if (has_prop(groups, current_series.group)) {
      groups[current_series.group].dataseries.push(current_series)
    } else {
      groups[current_series.group] = {
        name: current_series.group,
        dataseries: [current_series]
      }
    }
  }
  return Object.values(groups)
}

/**
 * Replace strings enclosed with curly brackets with given values.
 * @param vars A map of variable names and their values
 * @param template A string which might contain curly brackets (handlebars).
 * @returns A string with any replacements made.
 */
function handlebars_replace(vars: Record<string, string>, 
                            template: string): 
                            Either<ParseError, string> {
  const handlebar_regex = /({\w+})/gi
  const matches = template.match(handlebar_regex)
  if (matches === null) {
    return Right(template)
  }
  let final = template

  for (const matched_string of matches) {
    const stripped_string = matched_string.slice(1, matched_string.length - 1)
    if (has_prop(vars, stripped_string)) {
      final = final.replace(matched_string, vars[stripped_string])
    } else {
      return Left(
        new ParseError(
          `Encountered unknown variable "${matched_string}" when parsing dataseries template.`))
    }
  }

  return Right(final)
}

function handlebars_replace_recursive(vars: Record<string, string>, 
                                      object: Record<string, unknown>): 
                                      Either<ParseError, Record<string, any>> {
  for (const [key, value] of Object.entries(object)) {
    if (typeof value === 'object') {
      const replace_recurse = handlebars_replace_recursive(vars, 
                                        object[key] as Record<string, unknown>)
      if (isLeft(replace_recurse)) {
        return replace_recurse
      } else {
        object[key] = replace_recurse.value
      }
    } else {
      const replace = handlebars_replace(vars, value as string)
      if (isLeft(replace)) {
        return replace
      } else {
        object[key] = replace.value
      }
    }
  }
  return Right(object)
}

export async function TemplateParser(template: Partial<Template>, 
                                     absolute_application_path: string): 
                                     Promise<Either<ParseError, ParsedGroup[]>>{
  if (!unsafeIsSafe(template)) {
    return Left(
      ParseError.MissingParamsError(template, 
                                    'template', 
                                    ['path', 'columns', 'dataseries']))
  }

  const absolute_template_path = path.join(absolute_application_path,
                                           template.path)
  template.path = absolute_template_path

  if (!location_exists(template.path)) {
    return Left(
      new ParseError(`Template file ${template.path} does not exist.`))
  }

  const template_values = await load_csv(template.path) as CSV
  if (template_values.length == 0) {
    return Left(
      new ParseError(
        `Template file ${template.path} is empty or malformatted.`))
  }

  const test_columns_match = csv_columns_match_given(template_values, template.columns)
  if (isLeft(test_columns_match)) {
    return test_columns_match
  }

  const unsafe_series: UnsafeSeries[] = []

  for (const template_row of template_values) {
    const enr = zip(template.columns, Object.values(template_row))
    const row_variables_map = Object.fromEntries(enr) as Record<string, string>
    const partial_series: Partial<TemplateSeries> = JSON.parse(
                                           JSON.stringify(template.dataseries))
    const parsed_template = handlebars_replace_recursive(row_variables_map, 
                                                                partial_series)
    if (isLeft(parsed_template)) {
      return parsed_template
    }

    unsafe_series.push(parsed_template.value)
  }

  const safe_series = DataseriesParser(unsafe_series, absolute_application_path)
  if (isLeft(safe_series)) {
    return safe_series
  }

  const parsed_groups: ParsedGroup[] = sort_into_groups(safe_series.value)
  return Right(parsed_groups)
}
