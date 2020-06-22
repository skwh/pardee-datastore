import { ParsedColumn } from '../models/parsed/Parsed.model'
import { ParseError } from '../models/error/Parse.error'
import { LabelList, Column_Label_Values } from '../models/ColumnValues.enum'
import { Either, Right, Left } from '../lib/Either'
import { ColumnNameMap } from '../models/ColumnNameMap.model'
import { has_all_props } from '../utils'

function labelsIsLabelList(labels: Record<string, ColumnNameMap[]>): 
                                                          labels is LabelList {
  return has_all_props(labels, Object.keys(Column_Label_Values))
}

export function LabelParser(columns: ParsedColumn[]): 
                                                Either<ParseError, LabelList> {
  const labels: Record<string, ColumnNameMap[]> = {}
  for (const key in Column_Label_Values) {
    labels[key] = []
    for (const column of columns) {
      if (column.label === key) {
        labels[key].push(column.nameMap)
      }
    }
  }

  if (!labelsIsLabelList(labels)) {
    return Left(
      ParseError.MissingParamsError(labels, 
                                    'labels', 
                                    Object.keys(Column_Label_Values)))
  }

  return Right(labels)
}