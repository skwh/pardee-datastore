import { Pool } from "pg";

import { POSTGRES_TYPE, ColumnInfo } from "../settings/parse";

const pool = new Pool({
  user: 'postgres',
  database: 'postgres'
});

export function make_postgres_type(str: string): POSTGRES_TYPE {
  switch (str) {
    case "number":
      return POSTGRES_TYPE.NUMBER;
    default:
      return POSTGRES_TYPE.STRING;
  }
}

async function perform_query(query_text: string, success_callback: ((response: any) => any), failure_callback: ((error: Error) => any)): Promise<any> {
  try {
    let response = await pool.query(query_text);
    return success_callback(response);
  } catch (e) {
    console.error(e);
    return failure_callback(e);
  }
}

async function boolean_query(query_text: string): Promise<boolean> {
  return perform_query(query_text, () => { return true; }, () => { return false; });
}

function stringify_column_info(info: ColumnInfo[]) {
  return info.map(({ name, type }: ColumnInfo) => `${name} ${type}`).join(',\n');
}

export async function drop_table(table_name: string): Promise<boolean> {
  const QUERY_TEXT = `DROP TABLE ${table_name}`;
  return boolean_query(QUERY_TEXT);
}

export async function make_table(table_name: string, columns_and_types: ColumnInfo[]): Promise<Boolean> {
  const QUERY_TEXT = `CREATE TABLE ${table_name} ( ${stringify_column_info(columns_and_types)} );`
  return boolean_query(QUERY_TEXT);
}

export async function load_from_csv(table_name: string, file_path: string): Promise<Boolean> {
  const QUERY_TEXT = `\COPY ${table_name} FROM '${file_path}' DELIMITER ',' CSV HEADER;`
  return boolean_query(QUERY_TEXT);
}

export async function get_domain_values(table_name: string, domain_key: string): Promise<string[]> {
  const QUERY_TEXT = `SELECT ${domain_key} FROM ${table_name}`;
  let res = await pool.query(QUERY_TEXT);
  return res.rows.map(obj => obj[domain_key]);
}