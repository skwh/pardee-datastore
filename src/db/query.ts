import { range_spread } from "../utils";
import { modify_column_name } from "../settings/parse";

export interface Query {
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

export class QueryFactory {
  private tableType: "monadic" | "dyadic";
  private tableName: string;
  public query: Query;

  constructor(name: string, type: "monadic" | "dyadic", query: Query) {
    this.tableName = name;
    this.tableType = type;
    this.query = query;
  }

  static is_domain_empty(q: Query): boolean {
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

  static is_only_domain(q: Query): boolean {
    return !q.range && !q.special;
  }

  static empty_values(q: Query): boolean {
    const domain_empty = QueryFactory.is_domain_empty(q);
    const range_empty = q.range?.values?.length === 0;
    const special_empty = q.special?.length === 0;

    return domain_empty && range_empty && special_empty;
  }

  static make_select(q: Query): string {
    if ((!q.domain && !q.special && !q.range) || QueryFactory.empty_values(q)) {
      return '*';
    } else {
      const r = [];
      if (q.domain) {
        q.domain.forEach(d => r.push(d.key));
      }
      if (QueryFactory.is_only_domain(q)) {
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

  make_where(q: Query): string {
    const r = [];
    if (!q.domain || QueryFactory.is_domain_empty(q)) return 'true';
    q.domain.forEach(d => {
      d.values.forEach(v => {
        r.push(`${d.key}='${v}'`);
      });
    });

    if (this.tableType === "monadic") {
      return r.join(' OR ');
    } else {
      return r.join(' AND ');
    }
  }

  query_to_sql(): string {
    const domain_range_plus_special = QueryFactory.make_select(this.query);
    const domain_restriction = this.make_where(this.query);

    return `SELECT DISTINCT ${domain_range_plus_special} FROM ${this.tableName} WHERE ${domain_restriction} ;`;
  }
}