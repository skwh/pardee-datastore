import { assert } from 'chai';
import 'mocha';

import {
  anyOf,
  allOf,
  range_spread,
  argsString,
  has_prop
} from '../utils';

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

    it('should correctly detect that at least one item passes the predicate', () => {
      const xs = [1, 2, 3];
      const predicate = (n: number): boolean => n < 2;

      const expected_value = true;
      const actual_value = anyOf(predicate, xs);

      assert.equal(actual_value, expected_value);
    });

    it('should correctly detect that all of the items do not pass the predicate', () => {
      const xs = [1, 2, 3];
      const predicate = (n: number): boolean => n > 10;

      const expected_value = false;
      const actual_value = anyOf(predicate, xs);

      assert.equal(actual_value, expected_value);
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

  describe('allOf', () => {
    it('should correctly detect that all items pass the predicate', () => {
      const xs = [ 1, 2, 3 ];
      const predicate = (n: number): boolean => n < 10;

      const expected_value = true;
      const actual_value = allOf(predicate, xs);

      assert.equal(actual_value, expected_value);
    });

    it('should correctly detect that at least one item does not pass the predicate', () => {
      const xs = [ 1, 2, 3 ];
      const predicate = (n: number): boolean => n < 2;

      const expected_value = false;
      const actual_value = allOf(predicate, xs);

      assert.equal(actual_value, expected_value);
    });
  });

  describe('argsString', () => {
    it('should correctly create a string of dollar args', () => {
      const num = 2;
      
      const expected_value = '$1, $2';
      const actual_value = argsString(num);

      assert.equal(actual_value, expected_value);
    });
  });

  describe('has_prop', () => {
    it('should correctly detect that an object has a given property', () => {
      const object = {
        a: '1'
      };
      const propName = 'a';

      const expected_value = true;
      const actual_value = has_prop(object, propName);

      assert.equal(actual_value, expected_value);
    });

    it('should correctly detect that an object does not have a property', () => {
      const object = {
        a: '1'
      };
      const propName = 'b';

      const expected_value = false;
      const actual_value = has_prop(object, propName);

      assert.equal(actual_value, expected_value);
    });
  });
});