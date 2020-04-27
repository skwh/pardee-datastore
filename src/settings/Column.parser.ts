import { Either, Left, Right, isLeft } from '../lib/Either';
import { Maybe, isNothing, fmapMaybe } from '../lib/Maybe';

import { ParseError } from '../models/error/Parse.error';
import { UnsafeColumn } from '../models/unsafe/Unsafe.model';
import { ParsedColumn } from '../models/parsed/Parsed.model';
import { has_prop, maybe_range_spread } from '../utils';
import { make_postgres_type } from '../db/db';
import { Column_Label_Values } from '../models/ColumnValues.enum';

interface SafeColumn {
  name: string;
  type: string;
  label: string;
  modifier?: string;
}

function modify_column_name(name: string): string {
  if (/^\d+/.test(name)) {
    return 'n' + name;
  }
  return name;
}

function parse_label(column: SafeColumn): Either<ParseError, Column_Label_Values> {
  if (column.label in Column_Label_Values) {
    return Right(column.label as Column_Label_Values);
  }
  return Left(new ParseError(`${column.label} is not a valid label for column ${column.name}`));
}

function parse_column(column: SafeColumn): Either<ParseError, ParsedColumn> {
  const name = column.name.toLowerCase();
  const label = parse_label(column);
  if (isLeft(label)) {
    return label;
  }
  return Right ({
    nameMap: {
      original: column.name,
      alias: name
    },
    type: make_postgres_type(column.type),
    label: label.value
  });
}

function parse_column_from_spread(column: SafeColumn): Maybe<ParsedColumn[]> {
  return fmapMaybe(maybe_range_spread(column.name), (v) => v.map(n => {
    const nstr: string = n.toString();
    return {
      nameMap: {
        alias: modify_column_name(nstr),
        original: nstr
      },
      type: make_postgres_type(column.type),
      label: column.label as Column_Label_Values
    };
  }));
}

function unsafeIsSafe(unsafe: UnsafeColumn): unsafe is SafeColumn {
  return (unsafe.label !== undefined && unsafe.name !== undefined && unsafe.type !== undefined);
}

export function ColumnParser(unsafe_columns: UnsafeColumn[]): Either<ParseError, ParsedColumn[]> {
  const columns: ParsedColumn[] = [];
  for (const column of unsafe_columns) {
    if (!unsafeIsSafe(column)) {
      return Left(ParseError.MissingParamsError(column, 'column', ['name', 'label', 'type']));
    }
    
    if (has_prop(column, 'modifier') && column.modifier === 'many') {
      const new_columns = parse_column_from_spread(column);
      if (isNothing(new_columns)) {
        return Left(new ParseError(`This range spread is improperly formatted: ${column.name}`));
      }

      columns.push(...new_columns.value);
    } else {
      const new_column = parse_column(column);
      if (isLeft(new_column)) {
        return new_column;
      }

      columns.push(new_column.value);
    }
  }
  return Right(columns);
}