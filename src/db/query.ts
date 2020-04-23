import { range_spread } from "../utils";
import { modify_column_name } from "../settings/parse";

export interface Query {
  domain?: {
    key: string;
    values?: string[];
  }[];
  dyad?: {
    p: {
      key: string;
      values?: string[];
    };
    q: {
      cokey: string;
      values?: string[];
    };
  };
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
    if ((!q.domain && !q.special && !q.range && !q.dyad) || QueryFactory.empty_values(q)) {
      return '*';
    } else {
      const r: string[] = [];
      if (q.domain) {
        q.domain.forEach(d => r.push(d.key));
      }
      if (q.dyad) {
        r.push(q.dyad.p.key);
        r.push(q.dyad.q.cokey);
      }
      if (QueryFactory.is_only_domain(q) && !q.dyad) {
        r.push('*');
      } else {
        if (q.special) r.push(...q.special);
        if (q.range) {
          if (q.range.values) r.push(...(q.range.values))
          else {
            r.push(...range_spread(q.range.from + '..' + q.range.to).map(m => m.toString()).map(modify_column_name));
          }
        }
      }
      return r.join(',');
    }
  }

  make_where(q: Query): string {
    if (q.dyad && this.tableType == "dyadic") {
      return this.make_dyad_where(q);
    } else if (!q.domain || QueryFactory.is_domain_empty(q)) {
      return 'true';
    } else {
      const r: string[] = [];

      q.domain.forEach(d => {
        d.values.forEach(v => {
          r.push(`${d.key}='${v}'`);
        });
      });
      return r.join(' OR ');
    }
  }

  make_dyad_where(q: Query): string {
    const r: string[] = [];
    const t: string[] = [];

    if (!q.dyad.p.values && !q.dyad.q.values) {
      return 'true';
    }

    if (!q.dyad.p.values || q.dyad.p.values.length === 0) {
      r.push(`${q.dyad.p.key}=*`)
    } else {
      q.dyad.p.values.forEach(v => {
        r.push(`${q.dyad.p.key}='${v}'`);
      });
    }

    if (!q.dyad.q.values || q.dyad.q.values.length === 0) {
      t.push(`${q.dyad.q.cokey}=*`);
    } else {
      q.dyad.q.values.forEach(v => {
        t.push(`${q.dyad.q.cokey}='${v}'`);
      });
    }

    return `(${r.join(' OR ')}) AND (${t.join(' OR ')})`;
  }

  query_to_sql(): string | undefined {
    const domain_range_plus_special = QueryFactory.make_select(this.query);
    const domain_restriction = this.make_where(this.query);

    return `SELECT DISTINCT ${domain_range_plus_special} FROM ${this.tableName} WHERE ${domain_restriction} ;`;
  }
}