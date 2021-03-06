type ColumnName = string;
type ColumnValue = string;
export type ColumnPair = [ColumnName, ColumnValue];

type MonadColumnSet = {
  values: ColumnPair[];
}

type DyadColumnSet = {
  p: ColumnPair[];
  q: ColumnPair[];
}

export type ColumnSet = MonadColumnSet | DyadColumnSet;

export function setIsDyadSet(set: ColumnSet): set is DyadColumnSet {
  return (set as DyadColumnSet).p !== undefined
}

type Connector = 'AND' | 'OR';

export function valueIsConditionTree(value: ColumnPair | ConditionTree): 
                                                        value is ConditionTree {
  return (value as ConditionTree).left !== undefined       
      && (value as ConditionTree).right !== undefined      
      && (value as ConditionTree).connector !== undefined
}

export type ConditionTree = {
  connector: Connector;
  left: Condition;
  right: Condition;
}

export type Condition = {
  value: ColumnPair | ConditionTree;
}

export type QueryColumns = string[] | '*';
export type QueryCondition = Condition | 'true';


export interface SqlQuery {
  columns: QueryColumns;
  condition: QueryCondition;
}