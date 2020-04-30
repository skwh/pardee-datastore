import { valueIsConditionTree, Condition, SqlQuery } from '../models/Query.model';

function stringify_condition(condition: Condition): string {
  if (valueIsConditionTree(condition.value)) {
    return `${stringify_condition(condition.value.left)} ${condition.value.connector} ${stringify_condition(condition.value.right)}`;
  } else {
    const [a, b] = condition.value;
    return `${a}='${b}'`;
  }
}

function columns_and_condition_to_sql_string(columns: string[] | '*', condition: Condition | 'true', table_name: string): string {
  let string_condition = '';
  if (condition === 'true') string_condition = condition;
  else string_condition = stringify_condition(condition);
  return `SELECT DISTINCT ${columns} FROM ${table_name} WHERE ${string_condition}`;
}

export function SqlQueryTransformer(query: SqlQuery, table_name: string): string {
  return (columns_and_condition_to_sql_string(query.columns, query.condition, table_name));
}