import { assert } from 'chai';
import 'mocha';

import {
  Response_Category,
  Response,
  make_response
} from '../api';
import { ColumnNameMap } from '../settings/parse.old';

describe('make_response', () => {
  it('should make a response out of a list of column name maps', () => {
    const name_maps: ColumnNameMap[] = [
      {
        original: 'test',
        alias: 'test'
      },
      {
        original: 'test 2',
        alias: 'test2'
      }
    ];
    const response_type: Response_Category = Response_Category.Range;

    const expected_value: Response = {
      'range': name_maps
    };
    const actual_value = make_response(response_type, name_maps);

    assert.deepEqual(actual_value, expected_value);
  });

  it('should make a response out of a list of strings', () => {
    const strs = ['test', 'test2'];
    const response_type = Response_Category.Special;

    const expected_value: Response = {
      'special': [
        {
          original: 'test',
          alias: 'test'
        },
        {
          original: 'test2',
          alias: 'test2'
        }
      ]
    };
    const actual_value = make_response(response_type, strs);

    assert.deepEqual(actual_value, expected_value);
  });
});