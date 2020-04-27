import { Pool, QueryResult } from 'pg';
import { ParsedColumn } from '../models/parsed/Parsed.model';

/**
 * Currently, only two datatypes are supported: strings and numbers.
 */
export enum Postgres_Type {
  STRING = 'character varying',
  NUMBER = 'double precision'
}

export function make_postgres_type(str: string): Postgres_Type {
  switch (str) {
    case 'number':
      return Postgres_Type.NUMBER;
    default:
      return Postgres_Type.STRING;
  }
}

// function escape_file_name(str: string): string {
  
// }

export class Database {
  pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async query(query_text: string): Promise<QueryResult> {
    return await this.pool.query(query_text);
  }

  stringify_column_info(info: ParsedColumn[]): string {
    return info.map(({ nameMap, type }: ParsedColumn) => `${nameMap.alias} ${type}`).join(',\n');
  }

  stringify_column_names(info: ParsedColumn[]): string {
    return info.map(({ nameMap }: ParsedColumn) => nameMap.alias).join(', ');
  }

  async drop_table(table_name: string): Promise<QueryResult> {
    const QUERY_TEXT = `DROP TABLE ${table_name}`;
    return this.pool.query(QUERY_TEXT);
  }

  async drop_index(table_name: string): Promise<QueryResult> {
    const QUERY_TEXT = `DROP INDEX index_${table_name};`;
    return this.pool.query(QUERY_TEXT);
  }

  async make_table(table_name: string, columns_and_types: ParsedColumn[]): Promise<QueryResult> {
    const QUERY_TEXT = `CREATE TABLE ${table_name} ( ${this.stringify_column_info(columns_and_types)} );`;
    return this.pool.query(QUERY_TEXT);
  }

  async make_index(table_name: string, columns: ParsedColumn[]): Promise<QueryResult> {
    const QUERY_TEXT = `CREATE INDEX index_${table_name} ON ${table_name} ( ${this.stringify_column_names(columns)} );`;
    return this.pool.query(QUERY_TEXT);
  }

  async load_from_csv(table_name: string, file_path: string): Promise<QueryResult> {
    // The copy command in Postgres requires an escape at the beginning.
    // eslint-disable-next-line no-useless-escape
    const QUERY_TEXT = `\COPY ${table_name} FROM '${file_path}' DELIMITER ',' CSV HEADER;`;
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
