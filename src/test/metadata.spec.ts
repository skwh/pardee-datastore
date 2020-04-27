import { assert } from 'chai';
import 'mocha';

import {
  retrieve_labeled_column_names, 
  retrieve_labeled_columns, 
  remove_name_map_duplicates
} from '../metadata';

import { 
  ColumnInfo, 
  Column_Label_Values, 
  Postgres_Type, 
  Column_Modifier_Values,
  ColumnNameMap
} from '../settings/parse.old';

const columns: ColumnInfo[] = [
  {
    nameMap: {
      original: 'test',
      alias: 'test',
    },
    label: Column_Label_Values.KEY,
    type: Postgres_Type.NUMBER
  },
  {
    nameMap: {
      original: 'test2',
      alias: 'test2'
    },
    label: Column_Label_Values.ANCHOR,
    type: Postgres_Type.NUMBER
  }
];

describe('retrieve_labeled_columns', () => {
  it('should return only column info objects which have the given label', () => {
    const desired_label = Column_Label_Values.ANCHOR;

    const expected_value = [columns[1]];
    const actual_value = retrieve_labeled_columns(columns, desired_label);

    assert.deepEqual(actual_value, expected_value);
  });
});

describe('retrieve_labeleled_column_names', () => {
  it('should return only the name maps from the column info objects with the given label', () => {
    const desired_label = Column_Label_Values.KEY;

    const expected_value = [{
      original: 'test',
      alias: 'test'
    }];
    const actual_value = retrieve_labeled_column_names(columns, desired_label);

    assert.deepEqual(actual_value, expected_value);
  });
});

describe('remove_name_map_duplicates', () => {
  it('should remove duplicates of column name maps with the same original value', () => {
    const names: ColumnNameMap[] = [
      {
        original: 'test',
        alias: 'test'
      },
      {
        original: 'test',
        alias: 'test'
      },
      {
        original: 'test 2',
        alias: 'test2'
      }
    ];

    const expected_value = names.slice(1);
    const actual_value = remove_name_map_duplicates(names);

    assert.deepEqual(actual_value, expected_value);
  });
});

describe('make_config', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('load_metadata_to_table', () => {
  it('should have tests written for it', () => assert.fail());
});