import { range_spread } from "../utils";
import { modify_column_name } from "../settings/parse";

export class Query {
  domain?: {
    key: string;
    values?: string[];
  }[];
  range?: {
    from?: string;
    to?: string;
    values?: string[];
  };
  special?: string[];
}

function is_domain_empty(q: Query): boolean {
  let empty = false;
  for (let i = 0; i < q.domain?.length; i++) {
    if (i == 0) {
      empty = (q.domain[i]?.values.length === 0);
      continue;
    }
    empty = empty && (q.domain[i]?.values.length === 0);
  }
  return empty;
}

function is_only_domain(q: Query): boolean {
  return !q.range && !q.special;
}

function empty_values(q: Query): boolean {
  const domain_empty = is_domain_empty(q);
  const range_empty = q.range?.values?.length === 0;
  const special_empty = q.special?.length === 0;

  return domain_empty && range_empty && special_empty;
}

export function make_select(q: Query): string {
  if ((!q.domain && !q.special && !q.range) || empty_values(q)) {
    return '*';
  } else {
    const r = [];
    if (q.domain) {
      q.domain.forEach(d => r.push(d.key));
    }
    if (is_only_domain(q)) {
      r.push('*');
    } else {
      if (q.special) r.push(...q.special);
      if (q.range) {
        if (q.range.values) r.push(...(q.range.values))
        else {
          r.push(range_spread(q.range.from + '..' + q.range.to).map(m => m.toString()).map(modify_column_name));
        }
      }
    }
    return r.join(',');
  }
}

export function make_where(q: Query): string {
  const r = [];
  if (!q.domain || is_domain_empty(q)) return 'true';
  q.domain.forEach(d => {
    d.values.forEach(v => {
      r.push(`${d.key}='${v}'`);
    });
  });
  return r.join(' OR ');
}

export function query_to_sql(table_name: string, q: Query): string {
  const domain_range_plus_special = make_select(q);
  const domain_restriction = make_where(q);

  return `SELECT DISTINCT ${domain_range_plus_special} FROM ${table_name} WHERE ${domain_restriction} ;`;
}