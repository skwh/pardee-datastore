import { assert } from 'chai';
import 'mocha';

import {
  anyOf,
  range_spread
} from '../src/utils';

describe('Utility functions', () => {
  describe('anyOf', () => {
    it('should return true if at least one item passes the predicate', () => {
      const predicate = (n: number): boolean => n == 1;
      const xs = [ 1, 2, 3 ];

      const expected_value = true;
      const actual_value = anyOf(predicate, xs);

      assert.deepEqual(actual_value, expected_value);
    });

    it('should not return true if no items pass the predicate', () => {
      const predicate = (n: number): boolean => n == 1;
      const xs = [ 2, 3, 4 ];

      const expected_value = false;
      const actual_value = anyOf(predicate, xs);

      assert.deepEqual(actual_value, expected_value);
    });
  });

  describe('range_spread', () => {
    it('should generate a list of numbers based on the given spread format', () => {
      const spread = '1..3';
      
      const expected_value = [ 1, 2, 3 ];
      const actual_value = range_spread(spread);

      assert.deepEqual(actual_value, expected_value);
    });

    it('should throw an error if the spread is improperly formatted', () => {
      const bad_spread = 'three..4';

      assert.throws(() => range_spread(bad_spread));
    });

    it('should not generate any numbers if the spread is in the wrong order', () => {
      const bad_spread = '10..1';

      const expected_value = [];
      const actual_value = range_spread(bad_spread);

      assert.deepEqual(actual_value, expected_value);
    });
  });
})