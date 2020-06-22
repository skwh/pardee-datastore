import { assert } from 'chai'
import 'mocha'

import { isLeft, isRight } from '../../lib/Either'

import { ColumnParser } from '../../settings/Column.parser'
import { UnsafeColumn } from '../../models/unsafe/Unsafe.model'
import { ParseError } from '../../models/error/Parse.error'

const isMissingParamsError = 
  (e: ParseError): boolean => e.message.includes('is missing param(s)')

describe('Column Parser', () => {
  
  describe('Column Properties', () => {

    it('should ensure that each column has a label', () => {
      const input: UnsafeColumn[] = [
        {
          name: 'Test',
          type: 'string'
          // missing 'label'
        }
      ]

      const actual_result = ColumnParser(input)
      if (isRight(actual_result)) {
        assert.fail('Column Parser parsed a column without a label!')
      }
      assert.isTrue(isLeft(actual_result))
      assert.isTrue(isMissingParamsError(actual_result.value))
      
    })

    it('should ensure that each column has a name', () => {
      const input: UnsafeColumn[] = [
        {
          label: 'range',
          type: 'string'
          // missing 'name'
        }
      ]

      const actual_result = ColumnParser(input)
      if (isRight(actual_result)) {
        assert.fail('Column Parser parsed a column without a name!')
      }
      assert.isTrue(isLeft(actual_result))
      assert.isTrue(isMissingParamsError(actual_result.value))
    })

    it('should ensure that each column has a type', () => {
      const input: UnsafeColumn[] = [
        {
          name: 'Test',
          label: 'range'
          // missing 'type'
        }
      ]

      const actual_result = ColumnParser(input)
      if (isRight(actual_result)) {
        assert.fail('Column Parser parsed a column without a type!')
      }
      assert.isTrue(isLeft(actual_result))
      assert.isTrue(isMissingParamsError(actual_result.value))
    })

  })
  

  it('should catch an improperly formatted spread', () => {
    const input: UnsafeColumn[] = [
      { 
        name: '1....5',
        label: 'range',
        type: 'number',
        modifier: 'many'
      }
    ]

    const actual_result = ColumnParser(input)
    if (isRight(actual_result)) {
      assert.fail(
          'Column Parser parsed a column with an improperly formatted spread!')
    }
    assert.isTrue(isLeft(actual_result))
    assert.isTrue(actual_result.value.message.includes('range spread'))
  })

  it('should catch an invalid label for a column', () => {
    const input: UnsafeColumn[] = [
      {
        name: 'Test',
        type: 'string',
        label: 'bad'
      }
    ]

    const actual_result = ColumnParser(input)
    if (isRight(actual_result)) {
      assert.fail(
        'Column Parser parsed a column with an invalid label!')
    }
    assert.isTrue(isLeft(actual_result))
    assert.isTrue(actual_result.value.message.includes('valid label'))
  })

  it('should format a numeric column name', () => {
    const input: UnsafeColumn[] = [
      {
        name: '2005',
        type: 'number',
        label: 'range'
      }
    ]

    const actual_result = ColumnParser(input)
    if (isLeft(actual_result)) {
      assert.fail(
        'ColumnParser threw an error instead of parsing a valid column!')
    }
    const safe_column = actual_result.value[0]
    assert.equal(safe_column.nameMap.alias, 'n2005')
  })

  it('should properly parse a numeric spread', () => {
    const input: UnsafeColumn[] = [
      {
        name: '1..3',
        type: 'number',
        label: 'range',
        modifier: 'many'
      }
    ]

    const actual_result = ColumnParser(input)
    if (isLeft(actual_result)) {
      assert.fail(
        'ColumnParser threw an error instead of parsing a valid column!')
    }
    const safe_columns = actual_result.value
    assert.equal(safe_columns.length, 3)
  })
})