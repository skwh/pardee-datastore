import { assert } from 'chai';
import 'mocha';

import { isLeft } from '../../lib/Either';

import { ParsedColumn } from '../../models/parsed/Parsed.model';
import { LabelParser } from '../../settings/Labels.parser';
import { Postgres_Type } from '../../db/db';
import { Column_Label_Values } from '../../models/ColumnValues.enum';

describe('Label Parser', () => {
  it('should group parsed columns by label', () => {
    const input: ParsedColumn[] = [
      {
        nameMap: {
          original: 'Test1',
          alias: 'Test1'
        },
        type: Postgres_Type.NUMBER,
        label: Column_Label_Values.key
      }
    ];

    const actual_result = LabelParser(input);
    if (isLeft(actual_result)) {
      assert.fail('Label Parser failed to parse columns!');
    }
    assert.equal(actual_result.value.key.length, 1);
  });
});