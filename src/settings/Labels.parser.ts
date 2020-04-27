import { ParsedColumn } from '../models/parsed/Parsed.model';
import { ParseError } from '../models/error/Parse.error';
import { LabelList, Column_Label_Values } from '../models/ColumnValues.enum';
import { Either, Right } from '../lib/Either';
import { ColumnNameMap } from '../models/ColumnNameMap.model';

export function LabelParser(columns: ParsedColumn[]): Either<ParseError, LabelList> {
  const labels: Record<string, ColumnNameMap[]> = {};
  for (const key in Column_Label_Values) {
    labels[key] = [];
    for (const column of columns) {
      if (column.label === key) {
        labels[key].push(column.nameMap);
      }
    }
  }
  return Right(labels as LabelList);
}