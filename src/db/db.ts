import { Pool } from "pg";

import { POSTGRES_TYPE, ColumnInfo, modify_column_name } from "../settings/parse";
import { range_spread } from "../utils";

export class Query {
  domain?: {
    key: string,
    values?: string[]
  }[];
  range?: {
    from?: string
    to?: string
    values?: string[]
  };
  special?: string[];
}

export class Database {
  pool: Pool;

  constructor() {
    this.pool = new Pool();
  }

  make_postgres_type(str: string): POSTGRES_TYPE {
    switch (str) {
      case "number":
        return POSTGRES_TYPE.NUMBER;
      default:
        return POSTGRES_TYPE.STRING;
    }
  }

  query_to_sql(table_name: string, q: Query): string {
    let domain_range_plus_special = (function () {
      let r = [];
      if (!q.domain && !q.special && !q.range) return '*';
      else {
        if (q.domain) {
          q.domain.forEach(d => r.push(d.key));
        }
        if (q.special) r.push(...q.special);
        if (q.range) {
          if (q.range.values) r.push(...(q.range.values.map(modify_column_name)))
          else {
            r.push(range_spread(q.range.from + '..' + q.range.to).map(m => m.toString()).map(modify_column_name));
          }
        }
        return r.join(',');
      }
    })();

    let domain_restriction = (function () {
      let r = [];
      if (!q.domain) return 'true';
      q.domain.forEach(d => {
        if (d.values.length > 1) {
          d.values.forEach(v => {
            r.push(`${d.key}='${v}'`);
          });
        } else {
          r.push(`${d.key}='${d.values[0]}'`)
        }
      });
      return r.join(' OR ');
    })();

    return `SELECT ${domain_range_plus_special} FROM ${table_name} WHERE ${domain_restriction} ;`;
  }

  async query(query_text: string): Promise<any> {
    return await this.pool.query(query_text);
  }

  async perform_query(query_text: string, success_callback: ((response: any) => any), failure_callback: ((error: Error) => any)): Promise<any> {
    try {
      let response = await this.pool.query(query_text);
      return success_callback(response);
    } catch (e) {
      console.error(e);
      return failure_callback(e);
    }
  }

  async boolean_query(query_text: string): Promise<boolean> {
    return this.perform_query(query_text, () => { return true; }, () => { return false; });
  }

  stringify_column_info(info: ColumnInfo[]) : string {
    return info.map(({ name, type }: ColumnInfo) => `${name} ${type}`).join(',\n');
  }

  async drop_table(table_name: string): Promise<boolean> {
    const QUERY_TEXT = `DROP TABLE ${table_name}`;
    return this.boolean_query(QUERY_TEXT);
  }

  async make_table(table_name: string, columns_and_types: ColumnInfo[]): Promise<Boolean> {
    const QUERY_TEXT = `CREATE TABLE ${table_name} ( ${this.stringify_column_info(columns_and_types)} );`
    return this.boolean_query(QUERY_TEXT);
  }

  async load_from_csv(table_name: string, file_path: string): Promise<Boolean> {
    const QUERY_TEXT = `\COPY ${table_name} FROM '${file_path}' DELIMITER ',' CSV HEADER;`
    return this.boolean_query(QUERY_TEXT);
  }

  async get_domain_values(table_name: string, domain_key: string): Promise<string[]> {
    const QUERY_TEXT = `SELECT ${domain_key} FROM ${table_name}`;
    let res = await this.pool.query(QUERY_TEXT);
    return res.rows.map(obj => obj[domain_key]);
  }
}

