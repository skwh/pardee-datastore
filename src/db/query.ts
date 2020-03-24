import { range_spread } from "../utils";
import { modify_column_name } from "../settings/parse";

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

export function query_to_sql(table_name: string, q: Query): string {
  let domain_range_plus_special = (function () {
    let r = [];
    if (!q.domain && !q.special && !q.range) return '*';
    else {
      if (q.domain) {
        q.domain.forEach(d => r.push(d.key));
      }
      if (q.special) r.push(...q.special);
      if (q.range) {
        if (q.range.values) r.push(...(q.range.values))
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
      d.values.forEach(v => {
        r.push(`${d.key}='${v}'`);
      });
    });
    return r.join(' OR ');
  })();

  return `SELECT DISTINCT ${domain_range_plus_special} FROM ${table_name} WHERE ${domain_restriction} ;`;
}