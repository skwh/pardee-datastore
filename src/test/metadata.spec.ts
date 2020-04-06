import { assert } from "chai";
import "mocha";

import {
  retrieve_labeled_column_names
} from "../metadata";
import { ColumnInfo, Column_Label_Values, Postgres_Type, Column_Modifier_Values } from "../settings/parse";

describe('retrieve_labeleled_column_names', () => {
  it('should return only the name maps from the column info objects with the given label', () => {
    const columns: ColumnInfo[] = [
      {
        nameMap: {
          original: "test",
          alias: "test",
        },
        label: Column_Label_Values.KEY,
        type: Postgres_Type.NUMBER
      },
      {
        nameMap: {
          original: "test2",
          alias: "test2"
        },
        label: Column_Label_Values.ANCHOR,
        type: Postgres_Type.NUMBER
      }
    ];
    const desired_label = Column_Label_Values.KEY;

    const expected_value = [{
      original: "test",
      alias: "test"
    }];
    const actual_value = retrieve_labeled_column_names(columns, desired_label);

    assert.deepEqual(actual_value, expected_value);
  });
});

describe('make_config', () => {
  it('should have tests written for it', () => assert.fail());
});

describe('load_metadata_to_table', () => {
  it('should have tests written for it', () => assert.fail());
});