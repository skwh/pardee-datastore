import { Either, Left, isLeft, Right } from '../lib/Either'

import { ParseError } from '../models/error/Parse.error'

import { ColumnParser } from './Column.parser'
import { TemplateParser } from './Template.parser'
import { GroupListParser } from './GroupList.parser'
import { LabelParser } from './Labels.parser'

import { ParsedGroup, ParsedSettingsData } from '../models/parsed/Parsed.model'
import { UnsafeColumn, UnsafeGroup } from '../models/unsafe/Unsafe.model'
import { Template } from '../models/template/Template.model'
import { has_prop, splitBy, tupleMap } from '../utils'

/**
 * The different sections that may be present in a settings yml file.
 */
enum Settings_Sections_Values {
  TEMPLATE = 'template',
  GROUPS = 'groups',
  COLUMNS = 'columns'
}

function yamlIsRecord(yaml: unknown): yaml is Record<string, unknown> {
  return (typeof yaml === 'object')
}

export async function SettingsParser(yaml: unknown, 
                                     absolute_application_path: string): 
                                     Promise<
                                          Either<
                                              ParseError,
                                              ParsedSettingsData>> {
  if (!yamlIsRecord(yaml)) {
    return Left(new ParseError(`Invalid format for settings.yml file.`))
  }

  if (!has_prop(yaml, Settings_Sections_Values.COLUMNS)) {
    return Left(new ParseError(`Settings file is missing required section 'columns'!`))
  }

  const columns_result = ColumnParser(yaml.columns as UnsafeColumn[])
  if (isLeft(columns_result)) {
    return columns_result
  }

  const labels_result = LabelParser(columns_result.value)
  if (isLeft(labels_result)) {
    return labels_result
  }

  const groups_result = await (async function(): Promise<Either<ParseError, ParsedGroup[]>> {
    if (has_prop(yaml, Settings_Sections_Values.TEMPLATE)) {
      return await TemplateParser(yaml.template as Partial<Template>, absolute_application_path)
    } else if (has_prop(yaml, Settings_Sections_Values.GROUPS)) {
      return GroupListParser(yaml.groups as UnsafeGroup[], absolute_application_path)
    }
    return Left(new ParseError(`Settings file is missing required section(s): either 'groups' or 'template' must be present.`))
  })()

  if (isLeft(groups_result)) {
    return groups_result
  }

  const [monadic_series_names, dyadic_series_names] = tupleMap(
                                splitBy(
                                  groups_result.value.flatMap(g => g.dataseries)
                                , s => s.type === 'monadic'),
                                s => s.name)

  return Right({
    columns: columns_result.value,
    groups: groups_result.value,
    labels: labels_result.value,
    dataseries: {
      monadic: monadic_series_names,
      dyadic: dyadic_series_names
    }
  })
}