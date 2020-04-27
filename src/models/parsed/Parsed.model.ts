import { ColumnNameMap } from '../ColumnNameMap.model';
import { Postgres_Type } from '../../db/db';
import { Column_Label_Values, LabelList } from '../ColumnValues.enum';
import { Series } from '../Series.model';

/**
 * How a column appears to the program after the settings file has been parsed.
 */
export interface ParsedColumn {
  nameMap: ColumnNameMap;
  type: Postgres_Type;
  label: Column_Label_Values;
}

export interface ParsedGroup {
  name: string;
  dataseries: Series[];
}

export interface ParsedSettingsData {
  groups: ParsedGroup[];
  columns: ParsedColumn[];
  labels: LabelList;
}