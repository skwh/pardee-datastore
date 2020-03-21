import { Pool } from "pg";

import { POSTGRES_TYPE, ColumnInfo } from "../settings/parse";

export function make_postgres_type(str: string): POSTGRES_TYPE {
  switch (str) {
    case "number":
      return POSTGRES_TYPE.NUMBER;
    default:
      return POSTGRES_TYPE.STRING;
  }
}

export class Database {
  pool: Pool;

  constructor() {
    this.pool = new Pool();
  }

  async query(query_text: string): Promise<any> {
    return await this.pool.query(query_text);
  }

  stringify_column_info(info: ColumnInfo[]) : string {
    return info.map(({ nameMap, type }: ColumnInfo) => `${nameMap.name} ${type}`).join(',\n');
  }

  async drop_table(table_name: string): Promise<any> {
    const QUERY_TEXT = `DROP TABLE ${table_name}`;
    return this.pool.query(QUERY_TEXT);
  }

  async make_table(table_name: string, columns_and_types: ColumnInfo[]): Promise<any> {
    const QUERY_TEXT = `CREATE TABLE ${table_name} ( ${this.stringify_column_info(columns_and_types)} );`
    return this.pool.query(QUERY_TEXT);
  }

  async load_from_csv(table_name: string, file_path: string): Promise<any> {
    const QUERY_TEXT = `\COPY ${table_name} FROM '${file_path}' DELIMITER ',' CSV HEADER;`
    return this.pool.query(QUERY_TEXT);
  }

  async get_domain_values(table_name: string, domain_key: string): Promise<string[]> {
    const QUERY_TEXT = `SELECT ${domain_key} FROM ${table_name}`;
    let res = await this.pool.query(QUERY_TEXT);
    return res.rows.map(obj => obj[domain_key]);
  }
}
