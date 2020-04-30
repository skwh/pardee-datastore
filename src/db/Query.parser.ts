import { Either, Left, Right, isLeft } from '../lib/Either';

import { range_spread } from '../utils';
import { UnsafeQuery } from '../models/unsafe/Unsafe.model';
import { ParseError } from '../models/error/Parse.error';
import { SqlQuery, ColumnPair, Condition, ColumnSet, setIsDyadSet, QueryColumns, QueryCondition } from '../models/Query.model';
import { modify_column_name } from '../settings/Column.parser';

function get_query_columns(unsafe_query: UnsafeQuery): QueryColumns {
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
      const range = `${unsafe_query.range.from}..${unsafe_query.range.to}`;
      const string_numbers = range_spread(range)
                                    .map(v => modify_column_name(v.toString()));
      input_columns.push(...string_numbers);
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

function parse_query_columns(query_columns: QueryColumns, 
                             real_column_names: string[]):
                             Either<ParseError, QueryColumns> {
  if (query_columns === '*') return Right(query_columns);

  for (const q of query_columns) {
    if (!real_column_names.includes(q)) {
      return Left(new ParseError(`Query contains invalid column name ${q}`));
    }
  }
  return Right(query_columns);
}

function get_query_condition_pairs(unsafe_query: UnsafeQuery): 
                                  Either<ParseError, ColumnSet | 'true'> {
  const input_pairs: ColumnPair[] = [];

  if (unsafe_query.dyad !== undefined) {
    // create a variable to preserve the type narrowing context
    const dyad = unsafe_query.dyad;
    
    const set = {
      p: [] as ColumnPair[],
      q: [] as ColumnPair[]
    };

    if (dyad.p.values !== undefined) {
      dyad.p.values.forEach(v => set.p.push([dyad.p.key, v]));
    }
    if (dyad.q.values !== undefined) {
      dyad.q.values.forEach(v => set.q.push([dyad.q.cokey, v]));
    }

    if (set.p.length === 0) {
      return Left(
        new ParseError(`Dyadic query is missing required values for 'p'`));
    }
    if (set.q.length === 0) {
      return Left(
        new ParseError(`Dyadic query is missing required values for 'q'`));
    }

    return Right(set as ColumnSet);

  } else if (unsafe_query.domain !== undefined) {
    const domain = unsafe_query.domain;
    for (const { key, values } of domain) {
      if (values !== undefined) {
        input_pairs.push(...values.map(v => [key, v] as ColumnPair));
      }
    }
  }

  if (input_pairs.length === 0) {
    return Right('true');
  } else {
    return Right({ values: input_pairs } as ColumnSet);
  }
}
function concat_pairs_or(pairs: ColumnPair[]): Condition {
  if (pairs.length == 1) {
    return {
      value: pairs[0]
    };
  }
  if (pairs.length == 2) {
    return {
      value: {
        connector: 'OR',
        left: {
          value: pairs[0]
        },
        right: {
          value: pairs[1]
        }
      }
    };
  }

  const halfway_point = Math.floor(pairs.length / 2);
  const first_half = pairs.slice(0, halfway_point);
  const second_half = pairs.slice(halfway_point);

  return {
    value: {
      connector: 'OR',
      left: concat_pairs_or(first_half),
      right: concat_pairs_or(second_half)
    }
  };
}

function parse_query_condition_pairs(set: ColumnSet | 'true',
                                     real_column_values: string[],
                                     table_type: 'monadic' | 'dyadic'): 
                                     Either<ParseError, QueryCondition> {
  if (set === 'true') return Right('true');

  const all_pairs: ColumnPair[] = [];
  if (setIsDyadSet(set)) {
    all_pairs.push(...set.p);
    all_pairs.push(...set.q);
  } else {
    all_pairs.push(...set.values);
  }

  for (const [__, value] of all_pairs) {
    if (!real_column_values.includes(value)) {
      return Left(
        new ParseError(`Query contains invalid codomain value ${value}`));
    }
  }

  const query_type = setIsDyadSet(set) ? 'dyadic' : 'monadic';

  if (setIsDyadSet(set) && table_type == 'dyadic') {
    return Right({
      value: {
        connector: 'AND',
        left: concat_pairs_or(set.p),
        right: concat_pairs_or(set.q)
      }
    });
  } else if (table_type === 'monadic') {
    return Right(concat_pairs_or(all_pairs));
  } else {
    return Left(
      new ParseError(
        `The query type ${query_type} and table type ${table_type} are incompatible.`
      ));
  }
}

export function QueryParser( unsafe_query: UnsafeQuery 
                           , column_names: string[] 
                           , column_values: string[] 
                           , table_type: 'monadic' | 'dyadic'): 
                           Either<ParseError, SqlQuery> {

  const query_columns = parse_query_columns(
                                get_query_columns(unsafe_query), column_names);
  if (isLeft(query_columns)) {
    return query_columns;
  }

  const condition_pairs = get_query_condition_pairs(unsafe_query);
  if (isLeft(condition_pairs)) {
    return condition_pairs;
  }

  const query_condition = parse_query_condition_pairs(condition_pairs.value, 
                                                      column_values, 
                                                      table_type);
  if (isLeft(query_condition)) {
    return query_condition;
  }

  return Right({
    columns: query_columns.value,
    condition: query_condition.value
  });
}
