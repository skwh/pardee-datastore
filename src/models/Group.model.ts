import { Series } from './Series.model'
import { ColumnNameMap } from './ColumnNameMap.model'

export interface Group {
  name: string;
  dataseries: Series[];
  domain_keys: Record<string, ColumnNameMap[]>;
  codomain_keys: Record<string, ColumnNameMap[]>;
  combined_key_values: string[];
}