import { Pool, QueryResult,  } from "pg";

import { Postgres_Type, ColumnInfo } from "../settings/parse";

export function make_postgres_type(str: string): Postgres_Type {
  switch (str) {
    case "number":
      return Postgres_Type.NUMBER;
    default:
      return Postgres_Type.STRING;
  }
}

export class Database {
  pool: Pool;

  constructor() {
    this.pool = new Pool();
  }

  async query(query_text: string): Promise<QueryResult> {
    return await this.pool.query(query_text);
  }

  stringify_column_info(info: ColumnInfo[]): string {
    return info.map(({ nameMap, type }: ColumnInfo) => `${nameMap.alias} ${type}`).join(',\n');
  }

  async drop_table(table_name: string): Promise<QueryResult> {
    const QUERY_TEXT = `DROP TABLE ${table_name}`;
    return this.pool.query(QUERY_TEXT);
  }

  async make_table(table_name: string, columns_and_types: ColumnInfo[]): Promise<QueryResult> {
    const QUERY_TEXT = `CREATE TABLE ${table_name} ( ${this.stringify_column_info(columns_and_types)} );`
    return this.pool.query(QUERY_TEXT);
  }

  async load_from_csv(table_name: string, file_path: string): Promise<QueryResult> {
    // eslint-disable-next-line no-useless-escape
    const QUERY_TEXT = `\COPY ${table_name} FROM '${file_path}' DELIMITER ',' CSV HEADER;`
    return this.pool.query(QUERY_TEXT);
  }

  async get_domain_values(table_name: string, domain_key: string): Promise<string[]> {
    const QUERY_TEXT = `SELECT ${domain_key} FROM ${table_name}`;
    const res = await this.pool.query(QUERY_TEXT);
    return res.rows.map(obj => obj[domain_key]);
  }

  async table_exists(table_name: string): Promise<boolean> {
    const QUERY_TEXT = `SELECT to_regclass('${table_name}')`;
    const res = await this.pool.query(QUERY_TEXT);
    if (res.rows.length === 0) return false;
    return true;
  }
}
