import { Either, Left, Right, isLeft } from '../lib/Either';

import { range_spread, has_prop } from '../utils';
import { UnsafeQuery } from '../models/unsafe/Unsafe.model';
import { ParseError } from '../models/error/Parse.error';
import { Maybe, Just, Nothing, isNothing } from '../lib/Maybe';

type Connector = 'AND' | 'OR';

type ConditionTree = {
  connector: Connector;
  left: [string, string] | ConditionTree;
  right: [string, string] | ConditionTree;
}

interface SqlQuery {
  columns?: string[] | '*';
  condition?: ConditionTree | 'true';
}

function get_query_columns(unsafe_query: UnsafeQuery): string[] | '*' {
  const input_columns: string[] = [];
  if (unsafe_query.dyad !== undefined) {
    input_columns.push(unsafe_query.dyad.p.key, unsafe_query.dyad.q.cokey);
  } else if (unsafe_query.domain !== undefined) {
    input_columns.push(...unsafe_query.domain.map(v => v.key));
  }
  if (unsafe_query.range !== undefined) {
    if (unsafe_query.range.values !== undefined) {
      input_columns.push(...unsafe_query.range.values);
    }
    if (unsafe_query.range.from !== undefined &&
        unsafe_query.range.to !== undefined) {
        input_columns.push(...range_spread(`${unsafe_query.range.from}..${unsafe_query.range.to}`).map(v => v.toString()));
    }
  }
  if (unsafe_query.special !== undefined) {
    input_columns.push(...unsafe_query.special);
  }

  if (input_columns.length === 0) {
    return '*';
  } else {
    return input_columns;
  } 
}

function parse_query_columns(query_columns: string[] | '*', real_column_names: string[]): Maybe<string[] | '*'> {
  if (query_columns === '*') return Just(query_columns);

  for (const q of query_columns) {
    if (!real_column_names.includes(q)) {
      return Nothing;
    }
  }

  return Just(query_columns);
}

function get_query_condition_pairs(unsafe_query: UnsafeQuery): [string, string][] | 'true' {
  const input_pairs: [string, string][] = [];

  if (input_pairs.length === 0) {
    return 'true';
  } else {
    return input_pairs;
  }
}

function parse_query_condition_pairs(pairs: [string, string][], real_column_names: string[], real_column_values: string[]): Either<ParseError, ConditionTree | 'true'> {

}

export function QueryParser(unsafe_query: UnsafeQuery, 
                            column_names: string[], 
                            column_values: string[], 
                            data_type: 'monadic' | 'dyadic'): Either<ParseError, string> {

  const query_columns = parse_query_columns(get_query_columns(unsafe_query), column_names);
  if (isNothing(query_columns)) {
    return Left(new ParseError('Query contained invalid column names!'));
  }

  const query_condition = parse_query_condition()
}