import { ColumnNameMap } from './ColumnNameMap.model';

/**
 * KEY : this column makes up the "domain" of the dataset. It is a value that a user
 *          would be searching against. It would be a keyed column in a standard RDBMS.
 * COKEY : in the case of a dyadic dataset, this column makes up the second coordinate of the domain.
 * RANGE : this column contains datapoints for every item in the "domain". Generally represents a
 *          certain measurement or slice between data.
 * SPECIAL : this column contains the same type of data as RANGE, but is distinct in some way. 
 * ANCHOR : this column has the same value for the entire table.
 */
export enum Column_Label_Values {
  key = 'key',
  cokey = 'cokey',
  special = 'special',
  range = 'range',
  anchor = 'anchor'
}

/**
 * MANY : multiple columns are generated based on a numeric spread in the name field.
 *          generally used to fill date ranges for years.
 */
enum Column_Modifier_Values {
  MANY = 'many'
}

/**
 * An object which holds the string names of each column which have been assigned
 * to each avaliable label.
 */
export type LabelList = {
  [key in Column_Label_Values]: ColumnNameMap[]
}