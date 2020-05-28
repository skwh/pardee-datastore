import { assert } from 'chai';
import 'mocha';

import { isLeft, isRight } from '../../lib/Either';

import { UnsafeSeries } from '../../models/unsafe/Unsafe.model';
import { DataseriesParser } from '../../settings/Dataseries.parser';
import { ParseError } from '../../models/error/Parse.error';

const absolute_application_path = __dirname;

const isMissingParamsError =
  (e: ParseError): boolean => e.message.includes('is missing param(s)');

describe('Dataseries Parser', () => {

  describe('Required Parameters', () => {

    it('should catch a missing name', () => {
      const input: UnsafeSeries[] = [
        {
          location: 'fake location',
          type: 'monadic',
          group: 'fake group name'
        }
      ];

      const actual_result = DataseriesParser(input,
                                             absolute_application_path);
      if (isRight(actual_result)) {
        assert.fail(
          'Dataseries Parser parsed a series with a missing name!');
      }
      assert.isTrue(isLeft(actual_result));
      assert.isTrue(isMissingParamsError(actual_result.value));
    });

    it('should catch a missing location', () => {
      const input: UnsafeSeries[] = [
        {
          name: 'fake name',
          type: 'monadic',
          group: 'fake group name'
        }
      ];

      const actual_result = DataseriesParser(input,
                                             absolute_application_path);
      if (isRight(actual_result)) {
        assert.fail(
          'Dataseries Parser parsed a series with a missing location!');
      }
      assert.isTrue(isLeft(actual_result));
      assert.isTrue(isMissingParamsError(actual_result.value));
    });

    it('should catch a missing type', () => {
      const input: UnsafeSeries[] = [
        {
          name: 'fake name',
          location: 'fake location',
          group: 'fake group name'
        }
      ];

      const actual_result = DataseriesParser(input,
                                             absolute_application_path);
      if (isRight(actual_result)) {
        assert.fail(
          'Dataseries Parser parsed a series with a missing type!');
      }
      assert.isTrue(isLeft(actual_result));
      assert.isTrue(isMissingParamsError(actual_result.value));
    });

    it('should catch a missing group', () => {
      const input: UnsafeSeries[] = [
        {
          name: 'fake name',
          location: 'fake location',
          type: 'monadic'
        }
      ];

      const actual_result = DataseriesParser(input,
                                             absolute_application_path);
      if (isRight(actual_result)) {
        assert.fail(
          'Dataseries Parser parsed a series with a missing group!');
      }
      assert.isTrue(isLeft(actual_result));
      assert.isTrue(isMissingParamsError(actual_result.value));
    });

  });

  it('should catch a nonexistent file location', () => {
    const input: UnsafeSeries[] = [
      {
        name: 'fake name',
        location: 'fake location',
        type: 'monadic',
        group: 'fake group name'
      }
    ];

    const actual_result = DataseriesParser(input,
                                           absolute_application_path);
    if (isRight(actual_result)) {
      assert.fail(
        'Dataseries Parser parsed a series with a nonexistent file location!');
    }
    assert.isTrue(isLeft(actual_result));
    assert.isTrue(actual_result.value.message.includes('does not exist'));
  });

  it('should catch an invalid series type', () => {
    const input: UnsafeSeries[] = [
      {
        name: 'fake name',
        location: 'fake location',
        type: 'bad type',
        group: 'fake group name'
      }
    ];

    const actual_result = DataseriesParser(input,
                                           absolute_application_path);
    if (isRight(actual_result)) {
      assert.fail(
        'Dataseries Parser parsed a series with an invalid series type!');
    }
    assert.isTrue(isLeft(actual_result));
    assert.isTrue(actual_result.value.message.includes('Valid values are'));
  });

  it('should catch an invalid series name', () => {
    const input: UnsafeSeries[] = [
      {
        name: 'values',
        location: 'fake location',
        type: 'monadic',
        group: 'fake group name'
      }
    ];

    const actual_result = DataseriesParser(input,
                                           absolute_application_path);
    if (isRight(actual_result)) {
      assert.fail(
        'Dataseries Parser parsed a series with an invalid name!');
    }
    assert.isTrue(isLeft(actual_result));
    assert.isTrue(actual_result.value.message.includes('may not be named'));
  });
});